import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InspectionEntity } from '../inspections/entities/inspection.entity';
import { UserRole } from 'src/common/enums/user-role.enum';
import { ForbiddenCustomException } from 'src/common/http/exceptions/forbidden.exception';
import { NotFoundCustomException } from 'src/common/http/exceptions/not-found.exception';
import {
  KIGALI_DISTRICTS_LOWER,
  normalizeName,
} from 'src/common/constants/location.constants';
import { createObjectCsvStringifier } from 'csv-writer';
import PDFDocument from 'pdfkit';
import { Buffer } from 'buffer';
import * as fs from 'fs';
import * as path from 'path';
import SVGtoPDF from 'svg-to-pdfkit';
import { R2Service } from '../storage/r2.service';
import { Decision } from 'src/common/enums/decision.enum';
import { VisitType } from 'src/common/enums/visit-type.enum';
import { FaultEntity } from '../faults/entities/fault.entity';

const MM_TO_PT = 2.8346456693;
const mm = (value: number) => value * MM_TO_PT;

const REPORT_COLORS = {
  NAVY: '#0D2B5E',
  STEEL_BLUE: '#1F5BB4',
  BLUE_TINT: '#E8EFF9',
  PAGE_BG: '#F0F4FA',
  CARD_BG: '#FFFFFF',
  TEXT_DARK: '#0F172A',
  TEXT_MUTED: '#64748B',
  BORDER: '#E2E8F0',
  GREEN: '#16A34A',
  GREEN_BG: '#DCFCE7',
  AMBER: '#B45309',
  AMBER_BG: '#FEF3C7',
  ORANGE: '#E8650A',
  ORANGE_BG: '#FEF0E6',
  RED: '#C0392B',
  RED_BG: '#FDECEB',
  PURPLE: '#6B21A8',
  PURPLE_BG: '#F3E8FF',
  NAVY_DARKER: '#0A2050',
  TEXT_ON_DARK_MUTED: '#B8CCE8',
};

@Injectable()
export class ReportsService {
  private coatOfArmsSvg?: string | null;

  constructor(
    @InjectRepository(InspectionEntity)
    private readonly inspectionsRepository: Repository<InspectionEntity>,
    @InjectRepository(FaultEntity)
    private readonly faultsRepository: Repository<FaultEntity>,
    private readonly r2Service: R2Service,
  ) {}

  async generateReport(
    user: { role: UserRole; district: string; sector: string; sub: string },
    filters: ReportFilters & { format: 'pdf' | 'csv' },
  ): Promise<Buffer | string> {
    const inspections = await this.getFilteredInspections(user, filters);
    if (filters.format === 'csv') {
      return await this.buildCsvReport(inspections);
    }
    return this.buildPdfReport(inspections);
  }

  async summary(user: { role: UserRole; district: string; sector: string; sub: string }) {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    const qbBase = this.inspectionsRepository
      .createQueryBuilder('inspection')
      .leftJoinAndSelect('inspection.facility', 'facility')
      .leftJoinAndSelect('inspection.createdBy', 'createdBy');

    if (user.role === UserRole.HSO) {
      qbBase.andWhere(
        '(createdBy.id = :userId OR LOWER(facility.sector) = :sector)',
        {
          userId: user.sub,
          sector: normalizeName(user.sector),
        },
      );
    } else if (user.role === UserRole.DISTRICT_MANAGER) {
      qbBase.andWhere('LOWER(facility.district) = :district', {
        district: normalizeName(user.district),
      });
    } else if (user.role === UserRole.CITY_MANAGER) {
      qbBase.andWhere('LOWER(facility.district) IN (:...districts)', {
        districts: KIGALI_DISTRICTS_LOWER,
      });
    }

    const todayCount = await qbBase
      .clone()
      .andWhere('inspection.createdAt >= :start', { start: startOfToday })
      .getCount();

    const weekCount = await qbBase
      .clone()
      .andWhere('inspection.createdAt >= :start', { start: startOfWeek })
      .getCount();

    const totalFinesRow = await qbBase
      .clone()
      .select('COALESCE(SUM(inspection.totalFine), 0)', 'total')
      .andWhere('inspection.createdAt >= :start', { start: startOfWeek })
      .getRawOne<{ total: string }>();

    return {
      todayInspections: todayCount,
      weekInspections: weekCount,
      totalFines: Number(totalFinesRow?.total ?? 0),
    };
  }

  async exportInspectionsCsv(
    user: { role: UserRole; district: string; sector: string; sub: string },
    start?: number,
    end?: number,
  ): Promise<string> {
    const inspections = await this.getFilteredInspections(user, {
      startDate: start ? new Date(start).toISOString() : undefined,
      endDate: end ? new Date(end).toISOString() : undefined,
    });
    return this.buildCsvReport(inspections);
  }

  async generateInspectionPdf(
    user: { role: UserRole; district: string; sector: string; sub: string },
    inspectionId: string,
  ): Promise<Buffer> {
    const inspection = await this.inspectionsRepository.findOne({
      where: { id: inspectionId },
      relations: ['facility', 'createdBy', 'faults', 'faults.fault'],
    });
    if (!inspection) {
      throw new NotFoundCustomException('Inspection not found');
    }
    this.ensureAccess(user, inspection);

    const doc = new PDFDocument({ size: 'A4', margin: mm(20) });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    const pageCounter = { value: 0 };
    await this.renderInspectionReport(doc, inspection, pageCounter, {
      includeCover: true,
      addPageBefore: false,
    });
    doc.end();

    const pdf = await done;
    await this.r2Service.uploadPdf(`reports/inspection-${inspection.id}.pdf`, pdf);
    return pdf;
  }

  private ensureAccess(
    user: { role: UserRole; district: string; sector: string; sub: string },
    inspection: InspectionEntity,
  ) {
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
      return;
    }
    if (user.role === UserRole.CITY_MANAGER) {
      const district = normalizeName(inspection.facility?.district);
      if (!KIGALI_DISTRICTS_LOWER.includes(district)) {
        throw new ForbiddenCustomException('Access denied');
      }
      return;
    }
    if (user.role === UserRole.DISTRICT_MANAGER) {
      if (normalizeName(inspection.facility?.district) !== normalizeName(user.district)) {
        throw new ForbiddenCustomException('Access denied');
      }
      return;
    }
    if (inspection.createdBy?.id !== user.sub) {
      throw new ForbiddenCustomException('Access denied');
    }
  }

  private async getFilteredInspections(
    user: { role: UserRole; district: string; sector: string; sub: string },
    filters: ReportFilters,
  ) {
    const qb = this.inspectionsRepository
      .createQueryBuilder('inspection')
      .leftJoinAndSelect('inspection.facility', 'facility')
      .leftJoinAndSelect('inspection.createdBy', 'createdBy')
      .leftJoinAndSelect('inspection.faults', 'faults')
      .leftJoinAndSelect('faults.fault', 'fault');

    if (user.role === UserRole.HSO) {
      qb.andWhere(
        '(createdBy.id = :userId OR LOWER(facility.sector) = :sector)',
        {
          userId: user.sub,
          sector: normalizeName(user.sector),
        },
      );
    } else if (user.role === UserRole.DISTRICT_MANAGER) {
      qb.andWhere('LOWER(facility.district) = :district', {
        district: normalizeName(user.district),
      });
    } else if (user.role === UserRole.CITY_MANAGER) {
      qb.andWhere('LOWER(facility.district) IN (:...districts)', {
        districts: KIGALI_DISTRICTS_LOWER,
      });
    }

    if (filters.district) {
      qb.andWhere('LOWER(facility.district) = :filterDistrict', {
        filterDistrict: normalizeName(filters.district),
      });
    }
    if (filters.sector) {
      qb.andWhere('LOWER(facility.sector) = :filterSector', {
        filterSector: normalizeName(filters.sector),
      });
    }
    if (filters.facilityId) {
      qb.andWhere('facility.id = :facilityId', { facilityId: filters.facilityId });
    }
    if (filters.facilityName) {
      qb.andWhere('facility.name ILIKE :facilityName', {
        facilityName: `%${filters.facilityName}%`,
      });
    }
    if (filters.officerId) {
      qb.andWhere('createdBy.id = :officerId', { officerId: filters.officerId });
    }
    const visitType = this.resolveVisitType(filters.visitType);
    if (visitType) {
      qb.andWhere('inspection.visitType = :visitType', { visitType });
    }
    const decision = this.resolveDecision(filters.decision);
    if (decision) {
      qb.andWhere('inspection.decision = :decision', { decision });
    }

    const range = this.resolveDateRange(filters);
    if (range.start) {
      qb.andWhere('inspection.createdAt >= :start', { start: range.start });
    }
    if (range.end) {
      qb.andWhere('inspection.createdAt <= :end', { end: range.end });
    }

    return qb.orderBy('inspection.createdAt', 'DESC').getMany();
  }

  private resolveDecision(value?: string): Decision | undefined {
    if (!value) return undefined;
    const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
    const map: Record<string, Decision> = {
      WARNING: Decision.WARNING,
      CLOSURE_IMMEDIATE: Decision.CLOSURE_IMMEDIATE,
      CLOSURE_DEADLINE: Decision.CLOSURE_DEADLINE,
      PROSECUTION_RECOMMENDED: Decision.PROSECUTION_RECOMMENDED,
      PROSECUTION: Decision.PROSECUTION_RECOMMENDED,
      NO_ACTION: Decision.NO_ACTION,
      COMPLIANT: Decision.NO_ACTION,
    };
    return map[normalized];
  }

  private resolveVisitType(value?: string): VisitType | undefined {
    if (!value) return undefined;
    const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
    const map: Record<string, VisitType> = {
      FIRST_VISIT: VisitType.FIRST,
      FIRST: VisitType.FIRST,
      WARNING: VisitType.WARNING,
      FOLLOW_UP: VisitType.FOLLOW_UP,
      COMPLIANCE: VisitType.COMPLIANCE,
    };
    return map[normalized];
  }

  private resolveDateRange(filters: ReportFilters) {
    if (filters.startDate || filters.endDate) {
      let start: Date | undefined;
      let end: Date | undefined;
      if (filters.startDate) {
        const parsed = new Date(filters.startDate);
        if (!Number.isNaN(parsed.getTime())) {
          parsed.setHours(0, 0, 0, 0);
          start = parsed;
        }
      }
      if (filters.endDate) {
        const parsed = new Date(filters.endDate);
        if (!Number.isNaN(parsed.getTime())) {
          parsed.setHours(23, 59, 59, 999);
          end = parsed;
        }
      }
      return { start, end };
    }

    const now = new Date();
    if (filters.type === 'daily') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (filters.type === 'quarterly') {
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1);
      const end = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (filters.type === 'monthly') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    return { start: undefined, end: undefined };
  }

  private async buildQuestionResponses(inspection: InspectionEntity) {
    const selectedIds = new Map<string, number>();
    const selectedNames = new Map<string, number>();
    inspection.faults?.forEach((fault) => {
      const fine = fault.fineAmount ?? 0;
      if (fault.fault?.id) {
        selectedIds.set(fault.fault.id, fine);
      }
      if (fault.faultName) {
        selectedNames.set(fault.faultName, fine);
      }
    });

    const typeId =
      inspection.inspectionTypeId ??
      inspection.faults?.find((fault) => fault.fault?.inspectionType?.id)?.fault?.inspectionType
        ?.id;
    if (!typeId) {
      return inspection.faults?.map((fault) => ({
        question: fault.faultName,
        answer: 'No',
        fine: fault.fineAmount ?? 0,
      })) ?? [];
    }

    const questions = await this.faultsRepository.find({
      where: { inspectionType: { id: typeId }, active: true },
      order: { createdAt: 'ASC' },
    });

    return questions.map((fault) => {
      const fine =
        selectedIds.get(fault.id) ??
        selectedNames.get(fault.name) ??
        fault.standardFine ??
        0;
      const hasFault = selectedIds.has(fault.id) || selectedNames.has(fault.name);
      return {
        question: fault.name,
        answer: hasFault ? 'No' : 'Yes',
        fine: hasFault ? fine : 0,
      };
    });
  }

  private async buildCsvReport(inspections: InspectionEntity[]) {
    const csv = createObjectCsvStringifier({
      header: [
        { id: 'facilityName', title: 'Facility' },
        { id: 'tin', title: 'TIN' },
        { id: 'visitType', title: 'VisitType' },
        { id: 'decision', title: 'Decision' },
        { id: 'totalFine', title: 'TotalFine' },
        { id: 'createdAt', title: 'CreatedAt' },
        { id: 'sector', title: 'Sector' },
        { id: 'district', title: 'District' },
        { id: 'inspector', title: 'Inspector' },
        { id: 'responses', title: 'QuestionResponses' },
      ],
    });

    const records = await Promise.all(
      inspections.map(async (inspection) => {
        const responses = await this.buildQuestionResponses(inspection);
        const responseText = responses
        .map((item, index) =>
          `${index + 1}. ${item.question} - ${item.answer}${item.answer === 'No' ? ` (${item.fine} RWF)` : ''}`,
        )
        .join(' | ');
        return {
          facilityName: inspection.facilityName,
          tin: inspection.facility?.tin ?? '',
          visitType: inspection.visitType,
          decision: inspection.decision,
          totalFine: inspection.totalFine,
          createdAt: inspection.createdAt.toISOString(),
          sector: inspection.facility?.sector ?? '',
          district: inspection.facility?.district ?? '',
          inspector: inspection.createdBy?.fullName ?? '',
          responses: responseText,
        };
      }),
    );

    return csv.getHeaderString() + csv.stringifyRecords(records);
  }

  private async buildPdfReport(inspections: InspectionEntity[]) {
    const doc = new PDFDocument({ size: 'A4', margin: mm(20) });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    const pageCounter = { value: 0 };
    for (const [index, inspection] of inspections.entries()) {
      await this.renderInspectionReport(doc, inspection, pageCounter, {
        includeCover: true,
        addPageBefore: index > 0,
      });
    }

    doc.end();
    return done;
  }

  private async renderInspectionReport(
    doc: PDFDocument,
    inspection: InspectionEntity,
    pageCounter: { value: number },
    options: { includeCover: boolean; addPageBefore: boolean },
  ) {
    if (options.addPageBefore) {
      doc.addPage();
    }

    if (options.includeCover) {
      this.drawCoverPage(doc, inspection);
      this.addContentPage(doc, inspection, pageCounter);
    } else {
      this.drawHeaderFooter(doc, inspection, pageCounter.value);
      this.resetContentPosition(doc);
    }

    const questions = await this.buildQuestionResponses(inspection);
    const compliant = questions.filter((item) => item.answer === 'Yes');
    const faults = questions.filter((item) => item.answer === 'No');
    const complianceRate = questions.length
      ? Math.round((compliant.length / questions.length) * 100)
      : 0;

    this.drawSectionHeader(doc, 'Inspection Summary', inspection, pageCounter);
    this.drawSummaryStats(
      doc,
      [
        { label: 'Total Questions', value: `${questions.length}`, color: REPORT_COLORS.STEEL_BLUE },
        { label: 'Compliant', value: `${compliant.length}`, color: REPORT_COLORS.GREEN },
        { label: 'Faults Found', value: `${faults.length}`, color: REPORT_COLORS.RED },
        { label: 'Compliance Rate', value: `${complianceRate}%`, color: REPORT_COLORS.STEEL_BLUE },
        { label: 'Total Fine (RWF)', value: this.formatNumber(inspection.totalFine), color: REPORT_COLORS.AMBER },
      ],
      inspection,
      pageCounter,
    );

    this.drawSectionHeader(doc, 'Facility & Visit Details', inspection, pageCounter);
    this.drawFacilityVisitCards(doc, inspection, pageCounter);

    this.drawSectionHeader(doc, 'Questions & Answers', inspection, pageCounter);
    if (compliant.length) {
      this.drawQuestionTable(doc, {
        title: 'COMPLIANT ITEMS',
        headerFill: REPORT_COLORS.GREEN,
        headerText: '#FFFFFF',
        rowAltFill: '#F0FDF4',
        rows: compliant.map((item, index) => ({
          index: `${index + 1}`,
          question: item.question,
          answer: 'Yes',
          fine: '—',
        })),
        answerColor: REPORT_COLORS.GREEN,
        fineColor: REPORT_COLORS.TEXT_DARK,
        includeSubtotal: false,
      }, inspection, pageCounter);
    }

    if (faults.length) {
      this.drawQuestionTable(doc, {
        title: 'FAULTS FOUND',
        headerFill: REPORT_COLORS.RED,
        headerText: '#FFFFFF',
        rowAltFill: '#FFF5F5',
        rows: faults.map((item, index) => ({
          index: `${index + 1}`,
          question: item.question,
          answer: 'No',
          fine: item.fine ? this.formatNumber(item.fine) : '—',
        })),
        answerColor: REPORT_COLORS.RED,
        fineColor: REPORT_COLORS.RED,
        includeSubtotal: true,
        subtotal: `RWF ${this.formatNumber(inspection.totalFine)}`,
      }, inspection, pageCounter);
    }

    if (inspection.comments || inspection.recommendations) {
      this.drawSectionHeader(doc, 'Comments & Recommendations', inspection, pageCounter);
      this.drawCommentsSection(doc, inspection, pageCounter);
    }
  }

  private drawCoverPage(doc: PDFDocument, inspection: InspectionEntity) {
    const { label: decisionLabel, color: decisionColor } = this.getDecisionStyle(
      inspection.decision,
    );
    const facilityName = inspection.facility?.name ?? inspection.facilityName ?? 'Inspection Report';
    const tin = inspection.facility?.tin ?? '—';
    const district = inspection.facility?.district ?? '—';
    const sector = inspection.facility?.sector ?? '—';
    const inspector = inspection.createdBy?.fullName ?? '—';
    const visitType = this.formatEnumLabel(inspection.visitType);
    const reportId = inspection.id ?? '—';
    const dateLabel = this.formatDate(inspection.createdAt);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = doc.page.margins.left;

    doc.save();
    doc.rect(0, 0, pageWidth, pageHeight).fill(REPORT_COLORS.NAVY);
    const accentSize = mm(60);
    doc.rect(pageWidth - accentSize, 0, accentSize, accentSize).fill(REPORT_COLORS.STEEL_BLUE);
    doc.rect(0, pageHeight - mm(40), pageWidth, mm(40)).fill(REPORT_COLORS.NAVY_DARKER);

    this.drawCoatOfArms(doc, {
      x: pageWidth - accentSize + mm(10),
      y: mm(10),
      size: mm(32),
    });

    doc.fillColor(REPORT_COLORS.TEXT_ON_DARK_MUTED).font('Helvetica').fontSize(8);
    doc.text('KIGALI CITY — HEALTH INSPECTION SYSTEM', margin, mm(18));

    doc.roundedRect(margin, mm(28), mm(60), mm(10), 3).fill(REPORT_COLORS.STEEL_BLUE);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
    doc.text('INSPECTION REPORT', margin + mm(4), mm(30));

    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(26);
    doc.text(facilityName, margin, mm(58), {
      width: pageWidth - margin * 2 - mm(10),
    });

    const afterNameY = doc.y + mm(2);
    doc.fillColor(REPORT_COLORS.TEXT_ON_DARK_MUTED).font('Helvetica').fontSize(11);
    doc.text(`TIN: ${tin}`, margin, afterNameY);

    doc.strokeColor('#1A3A7A').lineWidth(1);
    doc.moveTo(margin, afterNameY + mm(6)).lineTo(pageWidth - margin, afterNameY + mm(6)).stroke();

    const metaStartY = afterNameY + mm(16);
    const col2X = pageWidth / 2;
    doc.fontSize(8).fillColor(REPORT_COLORS.TEXT_ON_DARK_MUTED);
    const metaLeft = [
      { label: 'District', value: district },
      { label: 'Sector', value: sector },
      { label: 'Inspector', value: inspector },
    ];
    const metaRight = [
      { label: 'Visit Type', value: visitType },
      { label: 'Date', value: dateLabel },
      { label: 'Report ID', value: reportId },
    ];
    metaLeft.forEach((item, index) => {
      const y = metaStartY + index * mm(14);
      doc.fillColor(REPORT_COLORS.TEXT_ON_DARK_MUTED).font('Helvetica').fontSize(8);
      doc.text(item.label.toUpperCase(), margin, y);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11);
      doc.text(item.value, margin, y + mm(5));
    });
    metaRight.forEach((item, index) => {
      const y = metaStartY + index * mm(14);
      doc.fillColor(REPORT_COLORS.TEXT_ON_DARK_MUTED).font('Helvetica').fontSize(8);
      doc.text(item.label.toUpperCase(), col2X, y);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11);
      doc.text(item.value, col2X, y + mm(5));
    });

    const badgeY = pageHeight - mm(82);
    doc.roundedRect(margin, badgeY, mm(80), mm(14), 4).fill(decisionColor);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(12);
    doc.text(`Decision: ${decisionLabel}`, margin + mm(4), badgeY + mm(4.3));

    doc.fillColor(REPORT_COLORS.TEXT_ON_DARK_MUTED).font('Helvetica').fontSize(9);
    doc.text('TOTAL FINE', margin, pageHeight - mm(60));
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(20);
    doc.text(`RWF ${this.formatNumber(inspection.totalFine)}`, margin, pageHeight - mm(50));

    doc.fillColor(REPORT_COLORS.TEXT_ON_DARK_MUTED).font('Helvetica').fontSize(8);
    doc.text(
      `Generated on ${this.formatDate(new Date())}  •  Kigali City Health Authority  •  Confidential`,
      margin,
      pageHeight - mm(20),
      { align: 'center', width: pageWidth - margin * 2 },
    );
    doc.restore();
  }

  private addContentPage(
    doc: PDFDocument,
    inspection: InspectionEntity,
    pageCounter: { value: number },
  ) {
    doc.addPage();
    pageCounter.value += 1;
    this.drawHeaderFooter(doc, inspection, pageCounter.value);
    this.resetContentPosition(doc);
  }

  private drawHeaderFooter(
    doc: PDFDocument,
    inspection: InspectionEntity,
    pageNumber: number,
  ) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = doc.page.margins.left;
    const headerHeight = mm(16);
    const footerHeight = mm(12);

    doc.save();
    doc.rect(0, 0, pageWidth, headerHeight).fill(REPORT_COLORS.NAVY);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
    doc.text('Kigali City — Health Inspection Report', margin, mm(6));

    const facilityName = inspection.facility?.name ?? inspection.facilityName ?? '';
    doc.fillColor(REPORT_COLORS.TEXT_ON_DARK_MUTED).font('Helvetica').fontSize(8);
    doc.text(facilityName, margin, mm(6), {
      width: pageWidth - margin * 2,
      align: 'right',
    });

    doc.rect(0, pageHeight - footerHeight, pageWidth, footerHeight).fill(REPORT_COLORS.PAGE_BG);
    doc.strokeColor(REPORT_COLORS.BORDER).lineWidth(0.5);
    doc.moveTo(margin, pageHeight - footerHeight).lineTo(pageWidth - margin, pageHeight - footerHeight).stroke();

    doc.fillColor(REPORT_COLORS.TEXT_MUTED).font('Helvetica').fontSize(7.5);
    doc.text(
      `Kigali City Health Authority  •  Confidential  •  Generated ${this.formatDate(new Date())}`,
      margin,
      pageHeight - footerHeight + mm(4),
    );
    doc.text(`Page ${pageNumber}`, margin, pageHeight - footerHeight + mm(4), {
      width: pageWidth - margin * 2,
      align: 'right',
    });
    doc.restore();
  }

  private resetContentPosition(doc: PDFDocument) {
    doc.x = doc.page.margins.left;
    doc.y = doc.page.margins.top + mm(18);
  }

  private getContentBottom(doc: PDFDocument) {
    return doc.page.height - doc.page.margins.bottom - mm(14);
  }

  private ensureSpace(
    doc: PDFDocument,
    height: number,
    inspection: InspectionEntity,
    pageCounter: { value: number },
  ) {
    if (doc.y + height > this.getContentBottom(doc)) {
      this.addContentPage(doc, inspection, pageCounter);
    }
  }

  private drawSectionHeader(
    doc: PDFDocument,
    title: string,
    inspection: InspectionEntity,
    pageCounter: { value: number },
  ) {
    this.ensureSpace(doc, mm(18), inspection, pageCounter);
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    doc.strokeColor(REPORT_COLORS.BORDER).lineWidth(0.5);
    doc.moveTo(left, doc.y).lineTo(right, doc.y).stroke();
    doc.y += mm(4);
    doc.fillColor(REPORT_COLORS.TEXT_MUTED).font('Helvetica-Bold').fontSize(8);
    doc.text(title.toUpperCase(), left, doc.y);
    doc.fillColor(REPORT_COLORS.TEXT_DARK).font('Helvetica-Bold').fontSize(13);
    doc.text(title, left, doc.y + mm(4));
    doc.y += mm(12);
  }

  private drawSummaryStats(
    doc: PDFDocument,
    stats: { label: string; value: string; color: string }[],
    inspection: InspectionEntity,
    pageCounter: { value: number },
  ) {
    const gap = mm(3);
    const left = doc.page.margins.left;
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const boxWidth = (contentWidth - gap * (stats.length - 1)) / stats.length;
    const boxHeight = mm(18);
    this.ensureSpace(doc, boxHeight + mm(4), inspection, pageCounter);

    stats.forEach((stat, index) => {
      const x = left + index * (boxWidth + gap);
      const y = doc.y;
      doc.roundedRect(x, y, boxWidth, boxHeight, 4)
        .fillAndStroke(REPORT_COLORS.CARD_BG, REPORT_COLORS.BORDER);
      doc.fillColor(REPORT_COLORS.TEXT_MUTED).font('Helvetica').fontSize(8);
      doc.text(stat.label, x, y + mm(3), { width: boxWidth, align: 'center' });
      doc.fillColor(stat.color).font('Helvetica-Bold').fontSize(13);
      doc.text(stat.value, x, y + mm(9), { width: boxWidth, align: 'center' });
    });
    doc.y += boxHeight + mm(6);
  }

  private drawFacilityVisitCards(
    doc: PDFDocument,
    inspection: InspectionEntity,
    pageCounter: { value: number },
  ) {
    const gap = mm(6);
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const cardWidth = (contentWidth - gap) / 2;
    const startX = doc.page.margins.left;
    const facilityRows = [
      ['Facility Name', inspection.facility?.name ?? inspection.facilityName ?? '—'],
      ['TIN', inspection.facility?.tin ?? '—'],
      ['District', inspection.facility?.district ?? '—'],
      ['Sector', inspection.facility?.sector ?? '—'],
    ];
    const visitRows = [
      ['Inspector', inspection.createdBy?.fullName ?? '—'],
      ['Visit Type', this.formatEnumLabel(inspection.visitType)],
      ['Decision', this.getDecisionStyle(inspection.decision).label],
      ['Date', this.formatDate(inspection.createdAt)],
    ];

    const facilityHeight = this.measureInfoCardHeight(doc, facilityRows, cardWidth);
    const visitHeight = this.measureInfoCardHeight(doc, visitRows, cardWidth);
    const cardHeight = Math.max(facilityHeight, visitHeight);
    this.ensureSpace(doc, cardHeight + mm(4), inspection, pageCounter);

    const startY = doc.y;
    this.drawInfoCard(doc, startX, startY, cardWidth, cardHeight, facilityRows);
    this.drawInfoCard(doc, startX + cardWidth + gap, startY, cardWidth, cardHeight, visitRows);

    doc.y = startY + cardHeight + mm(6);
  }

  private measureInfoCardHeight(
    doc: PDFDocument,
    rows: string[][],
    width: number,
  ) {
    const padding = mm(6);
    const labelWidth = width * 0.38;
    const valueWidth = width - labelWidth - padding * 2;
    let height = padding * 2;
    rows.forEach(([label, value]) => {
      doc.font('Helvetica').fontSize(9);
      const labelHeight = doc.heightOfString(label, { width: labelWidth });
      doc.font('Helvetica-Bold').fontSize(10);
      const valueHeight = doc.heightOfString(value, { width: valueWidth });
      height += Math.max(labelHeight, valueHeight) + mm(3);
    });
    return height;
  }

  private drawInfoCard(
    doc: PDFDocument,
    x: number,
    y: number,
    width: number,
    height: number,
    rows: string[][],
  ) {
    const padding = mm(6);
    const labelWidth = width * 0.38;
    const valueWidth = width - labelWidth - padding * 2;
    doc.roundedRect(x, y, width, height, 6).fillAndStroke(REPORT_COLORS.CARD_BG, REPORT_COLORS.BORDER);
    let cursorY = y + padding;
    rows.forEach(([label, value], index) => {
      doc.font('Helvetica').fontSize(9).fillColor(REPORT_COLORS.TEXT_MUTED);
      doc.text(label, x + padding, cursorY, { width: labelWidth });
      doc.font('Helvetica-Bold').fontSize(10).fillColor(REPORT_COLORS.TEXT_DARK);
      doc.text(value, x + padding + labelWidth, cursorY, { width: valueWidth });
      const rowHeight = Math.max(
        doc.heightOfString(label, { width: labelWidth }),
        doc.heightOfString(value, { width: valueWidth }),
      );
      cursorY += rowHeight + mm(2);
      if (index < rows.length - 1) {
        doc.strokeColor(REPORT_COLORS.BORDER).lineWidth(0.5);
        doc.moveTo(x + padding, cursorY).lineTo(x + width - padding, cursorY).stroke();
        cursorY += mm(1);
      }
    });
  }

  private drawQuestionTable(
    doc: PDFDocument,
    table: {
      title: string;
      headerFill: string;
      headerText: string;
      rowAltFill: string;
      rows: { index: string; question: string; answer: string; fine: string }[];
      answerColor: string;
      fineColor: string;
      includeSubtotal: boolean;
      subtotal?: string;
    },
    inspection: InspectionEntity,
    pageCounter: { value: number },
  ) {
    const left = doc.page.margins.left;
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidths = [mm(10), contentWidth - mm(50), mm(20), mm(20)];
    const headerHeight = mm(10);
    const rowPadding = mm(2.5);

    this.ensureSpace(doc, mm(12), inspection, pageCounter);
    doc.fillColor(REPORT_COLORS.TEXT_MUTED).font('Helvetica-Bold').fontSize(8);
    doc.text(table.title, left, doc.y);
    doc.y += mm(4);

    const drawHeader = () => {
      doc.roundedRect(left, doc.y, contentWidth, headerHeight, 2).fill(table.headerFill);
      doc.fillColor(table.headerText).font('Helvetica-Bold').fontSize(9);
      const headers = ['#', 'Question', 'Answer', 'Fine'];
      let x = left;
      headers.forEach((label, idx) => {
        doc.text(label, x + mm(2), doc.y + mm(2.5), { width: colWidths[idx], align: 'left' });
        x += colWidths[idx];
      });
      doc.y += headerHeight;
    };

    drawHeader();
    table.rows.forEach((row, rowIndex) => {
      const questionHeight = doc.heightOfString(row.question, {
        width: colWidths[1] - mm(4),
      });
      const rowHeight = Math.max(questionHeight, mm(6)) + rowPadding * 2;
      if (doc.y + rowHeight > this.getContentBottom(doc)) {
        this.addContentPage(doc, inspection, pageCounter);
        drawHeader();
      }
      if (rowIndex % 2 === 1) {
        doc.rect(left, doc.y, contentWidth, rowHeight).fill(table.rowAltFill);
      }
      doc.fillColor(REPORT_COLORS.TEXT_DARK).font('Helvetica').fontSize(9);
      doc.text(row.index, left + mm(2), doc.y + rowPadding, {
        width: colWidths[0],
        align: 'center',
      });
      doc.text(row.question, left + colWidths[0] + mm(2), doc.y + rowPadding, {
        width: colWidths[1] - mm(4),
      });
      doc.fillColor(table.answerColor).font('Helvetica-Bold').fontSize(9);
      doc.text(row.answer, left + colWidths[0] + colWidths[1] + mm(2), doc.y + rowPadding, {
        width: colWidths[2],
        align: 'center',
      });
      doc.fillColor(table.fineColor).font('Helvetica-Bold').fontSize(9);
      doc.text(row.fine, left + colWidths[0] + colWidths[1] + colWidths[2] + mm(2), doc.y + rowPadding, {
        width: colWidths[3],
        align: 'center',
      });

      doc.strokeColor(REPORT_COLORS.BORDER).lineWidth(0.5);
      doc.moveTo(left, doc.y + rowHeight).lineTo(left + contentWidth, doc.y + rowHeight).stroke();
      doc.y += rowHeight;
    });

    if (table.includeSubtotal && table.subtotal) {
      const subtotalHeight = mm(10);
      if (doc.y + subtotalHeight > this.getContentBottom(doc)) {
        this.addContentPage(doc, inspection, pageCounter);
        drawHeader();
      }
      doc.rect(left, doc.y, contentWidth, subtotalHeight).fill(REPORT_COLORS.BLUE_TINT);
      doc.fillColor(REPORT_COLORS.NAVY).font('Helvetica-Bold').fontSize(9);
      doc.text('SUBTOTAL FINES', left + mm(2), doc.y + mm(2.5), {
        width: colWidths[0] + colWidths[1] + colWidths[2],
        align: 'right',
      });
      doc.text(table.subtotal, left + colWidths[0] + colWidths[1] + colWidths[2], doc.y + mm(2.5), {
        width: colWidths[3],
        align: 'center',
      });
      doc.y += subtotalHeight + mm(6);
    } else {
      doc.y += mm(6);
    }
  }

  private drawCommentsSection(
    doc: PDFDocument,
    inspection: InspectionEntity,
    pageCounter: { value: number },
  ) {
    const left = doc.page.margins.left;
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const padding = mm(6);
    const comments = inspection.comments ?? '';
    const recommendations = inspection.recommendations ?? '';

    doc.font('Helvetica').fontSize(10);
    const commentsHeight = comments
      ? doc.heightOfString(comments, { width: contentWidth - padding * 2 })
      : mm(6);
    const recommendationsHeight = recommendations
      ? doc.heightOfString(recommendations, { width: contentWidth - padding * 2 })
      : mm(6);
    const totalHeight = padding * 4 + commentsHeight + recommendationsHeight + mm(8);
    this.ensureSpace(doc, totalHeight, inspection, pageCounter);

    const startY = doc.y;
    doc.roundedRect(left, startY, contentWidth, totalHeight, 6).fillAndStroke(
      REPORT_COLORS.CARD_BG,
      REPORT_COLORS.BORDER,
    );

    let cursorY = startY + padding;
    doc.fillColor(REPORT_COLORS.TEXT_MUTED).font('Helvetica-Bold').fontSize(8);
    doc.text('COMMENTS', left + padding, cursorY);
    cursorY += mm(4);
    doc.fillColor(REPORT_COLORS.TEXT_DARK).font('Helvetica').fontSize(10);
    doc.text(comments || 'No comments', left + padding, cursorY, {
      width: contentWidth - padding * 2,
    });
    cursorY += commentsHeight + padding;

    doc.strokeColor(REPORT_COLORS.BORDER).lineWidth(0.5);
    doc.moveTo(left + padding, cursorY).lineTo(left + contentWidth - padding, cursorY).stroke();
    cursorY += padding;

    doc.fillColor(REPORT_COLORS.TEXT_MUTED).font('Helvetica-Bold').fontSize(8);
    doc.text('RECOMMENDATIONS', left + padding, cursorY);
    cursorY += mm(4);
    doc.fillColor(REPORT_COLORS.TEXT_DARK).font('Helvetica').fontSize(10);
    doc.text(recommendations || 'No recommendations', left + padding, cursorY, {
      width: contentWidth - padding * 2,
    });

    doc.y = startY + totalHeight + mm(6);
  }

  private drawCoatOfArms(
    doc: PDFDocument,
    options: { x: number; y: number; size: number },
  ) {
    const svg = this.getCoatOfArmsSvg();
    if (!svg) {
      return;
    }
    SVGtoPDF(doc, svg, options.x, options.y, {
      width: options.size,
      height: options.size,
      preserveAspectRatio: 'xMidYMid meet',
    });
  }

  private getDecisionStyle(decision?: string) {
    const normalized = (decision ?? '').toUpperCase();
    switch (normalized) {
      case Decision.WARNING:
        return { color: REPORT_COLORS.AMBER, bg: REPORT_COLORS.AMBER_BG, label: 'Warning' };
      case Decision.CLOSURE_IMMEDIATE:
        return { color: REPORT_COLORS.RED, bg: REPORT_COLORS.RED_BG, label: 'Closure (Immediate)' };
      case Decision.CLOSURE_DEADLINE:
        return { color: REPORT_COLORS.ORANGE, bg: REPORT_COLORS.ORANGE_BG, label: 'Closure with Deadline' };
      case Decision.PROSECUTION_RECOMMENDED:
        return { color: REPORT_COLORS.PURPLE, bg: REPORT_COLORS.PURPLE_BG, label: 'Prosecution Recommended' };
      case Decision.NO_ACTION:
        return { color: REPORT_COLORS.GREEN, bg: REPORT_COLORS.GREEN_BG, label: 'No Action / Compliant' };
      case 'COMPLIANT':
        return { color: REPORT_COLORS.GREEN, bg: REPORT_COLORS.GREEN_BG, label: 'Compliant' };
      default:
        return { color: REPORT_COLORS.STEEL_BLUE, bg: REPORT_COLORS.BLUE_TINT, label: this.formatEnumLabel(decision) };
    }
  }

  private formatEnumLabel(value?: string) {
    if (!value) return '—';
    return value
      .toString()
      .trim()
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private formatDate(value?: Date | string) {
    if (!value) return '—';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return `${value}`.slice(0, 10);
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  }

  private formatNumber(value?: number) {
    if (!value && value !== 0) return '0';
    return Number(value).toLocaleString('en-US');
  }

  private getCoatOfArmsSvg(): string | null {
    if (this.coatOfArmsSvg !== undefined) {
      return this.coatOfArmsSvg;
    }

    const override = process.env.REPORT_COAT_OF_ARMS_SVG;
    const candidates = [
      override,
      path.resolve(process.cwd(), '..', 'pis_frontend', 'src', 'assets', 'coat_of_arms.svg'),
      path.resolve(process.cwd(), 'src', 'assets', 'coat_of_arms.svg'),
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        this.coatOfArmsSvg = fs.readFileSync(candidate, 'utf8');
        return this.coatOfArmsSvg;
      }
    }

    this.coatOfArmsSvg = null;
    return null;
  }
}

type ReportFilters = {
  format?: 'pdf' | 'csv';
  type?: string;
  startDate?: string;
  endDate?: string;
  district?: string;
  sector?: string;
  facilityId?: string;
  facilityName?: string;
  officerId?: string;
  visitType?: string;
  decision?: string;
};
