import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { Decision } from 'src/common/enums/decision.enum';
import { VisitType } from 'src/common/enums/visit-type.enum';
import { UserRole } from 'src/common/enums/user-role.enum';
import {
  KIGALI_DISTRICTS_LOWER,
  normalizeName,
} from 'src/common/constants/location.constants';
import { InspectionEntity } from 'src/modules/inspections/entities/inspection.entity';
import { InspectionFaultEntity } from 'src/modules/inspections/entities/inspection-fault.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(InspectionEntity)
    private readonly inspectionsRepository: Repository<InspectionEntity>,
    @InjectRepository(InspectionFaultEntity)
    private readonly inspectionFaultsRepository: Repository<InspectionFaultEntity>,
  ) {}

  async getStats(
    user: { role: UserRole; district: string; sector: string; sub: string },
    filters: DashboardFilters,
  ) {
    const inspections = await this.getFilteredInspections(user, filters);
    const totalInspections = inspections.length;
    const premisesInspected = new Set(
      inspections.map((inspection) => inspection.facility?.id ?? inspection.facilityName),
    ).size;
    const totalFines = inspections.reduce((sum, item) => sum + item.totalFine, 0);
    const faultsFound = inspections.reduce((sum, item) => sum + item.faultCount, 0);
    const avgFine = totalInspections ? Math.round(totalFines / totalInspections) : 0;
    const compliantCount = inspections.filter(
      (inspection) => inspection.decision === Decision.NO_ACTION,
    ).length;
    const complianceRate = totalInspections
      ? Math.round((compliantCount / totalInspections) * 100)
      : 0;
    const closureWarningCount = inspections.filter((inspection) =>
      [
        Decision.WARNING,
        Decision.CLOSURE_IMMEDIATE,
        Decision.CLOSURE_DEADLINE,
      ].includes(inspection.decision),
    ).length;
    const repeatOffenders = this.countRepeatOffenders(inspections);

    const periodChangePct = await this.getPeriodChangePct(user, filters);

    return {
      total_inspections: totalInspections,
      premises_inspected: premisesInspected,
      total_fines: totalFines,
      faults_found: faultsFound,
      avg_fine: avgFine,
      compliance_rate: complianceRate,
      closure_warning_count: closureWarningCount,
      repeat_offenders: repeatOffenders,
      period_change_pct: periodChangePct,
    };
  }

  async getTopOffenders(
    user: { role: UserRole; district: string; sector: string; sub: string },
    filters: DashboardFilters,
    limit = 5,
  ) {
    const inspections = await this.getFilteredInspections(user, filters);
    const byFacility = new Map<
      string,
      {
        facility_id: string;
        facility_name: string;
        sector?: string;
        total_faults: number;
        total_fines: number;
        inspection_count: number;
      }
    >();
    inspections.forEach((inspection) => {
      const facilityId = inspection.facility?.id ?? inspection.facilityName;
      const existing = byFacility.get(facilityId);
      const facilityName = inspection.facility?.name ?? inspection.facilityName;
      const sector = inspection.facility?.sector;
      if (!existing) {
        byFacility.set(facilityId, {
          facility_id: facilityId,
          facility_name: facilityName,
          sector,
          total_faults: inspection.faultCount,
          total_fines: inspection.totalFine,
          inspection_count: 1,
        });
      } else {
        existing.total_faults += inspection.faultCount;
        existing.total_fines += inspection.totalFine;
        existing.inspection_count += 1;
      }
    });

    return Array.from(byFacility.values())
      .sort((a, b) => b.total_faults - a.total_faults || b.total_fines - a.total_fines)
      .slice(0, limit);
  }

  async getInspectionsOverTime(
    user: { role: UserRole; district: string; sector: string; sub: string },
    filters: DashboardFilters,
  ) {
    const inspections = await this.getFilteredInspections(user, filters);
    const grouped = this.groupByDate(inspections);
    return Object.keys(grouped)
      .sort()
      .map((date) => ({ date, count: grouped[date].length }));
  }

  async getComplianceTrend(
    user: { role: UserRole; district: string; sector: string; sub: string },
    filters: DashboardFilters,
  ) {
    const inspections = await this.getFilteredInspections(user, filters);
    const grouped = this.groupByDate(inspections);
    return Object.keys(grouped)
      .sort()
      .map((date) => {
        const items = grouped[date];
        const total = items.length;
        const compliant = items.filter(
          (inspection) => inspection.decision === Decision.NO_ACTION,
        ).length;
        return {
          date,
          compliance_rate: total ? Math.round((compliant / total) * 100) : 0,
        };
      });
  }

  async getFaultsByType(
    user: { role: UserRole; district: string; sector: string; sub: string },
    filters: DashboardFilters,
  ) {
    const qb = this.inspectionFaultsRepository
      .createQueryBuilder('inspectionFault')
      .leftJoin('inspectionFault.inspection', 'inspection')
      .leftJoin('inspection.facility', 'facility')
      .leftJoin('inspection.createdBy', 'createdBy');
    this.applyInspectionFilters(qb, user, filters, {
      inspection: 'inspection',
      facility: 'facility',
      createdBy: 'createdBy',
    });
    qb.select('inspectionFault.faultName', 'fault_name')
      .addSelect('COUNT(*)', 'count')
      .groupBy('inspectionFault.faultName')
      .orderBy('count', 'DESC');
    const rows = await qb.getRawMany<{ fault_name: string; count: string }>();
    return rows.map((row) => ({
      fault_name: row.fault_name,
      count: Number(row.count),
    }));
  }

  async getDecisionsBreakdown(
    user: { role: UserRole; district: string; sector: string; sub: string },
    filters: DashboardFilters,
  ) {
    const inspections = await this.getFilteredInspections(user, filters);
    const counts = inspections.reduce<Record<string, number>>((acc, inspection) => {
      const key = this.toDecisionSlug(inspection.decision);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([decision, count]) => ({ decision, count }));
  }

  async getVisitTypeDistribution(
    user: { role: UserRole; district: string; sector: string; sub: string },
    filters: DashboardFilters,
  ) {
    const inspections = await this.getFilteredInspections(user, filters);
    const counts = inspections.reduce<Record<string, number>>((acc, inspection) => {
      const key = this.toVisitTypeSlug(inspection.visitType);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([visit_type, count]) => ({ visit_type, count }));
  }

  private async getFilteredInspections(
    user: { role: UserRole; district: string; sector: string; sub: string },
    filters: DashboardFilters,
  ) {
    const qb = this.inspectionsRepository
      .createQueryBuilder('inspection')
      .leftJoinAndSelect('inspection.facility', 'facility')
      .leftJoinAndSelect('inspection.createdBy', 'createdBy');
    this.applyInspectionFilters(qb, user, filters, {
      inspection: 'inspection',
      facility: 'facility',
      createdBy: 'createdBy',
    });
    qb.orderBy('inspection.createdAt', 'DESC');
    return qb.getMany();
  }

  private applyInspectionFilters<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    user: { role: UserRole; district: string; sector: string; sub: string },
    filters: DashboardFilters,
    aliases: { inspection: string; facility: string; createdBy: string },
  ) {
    if (user.role === UserRole.HSO) {
      qb.andWhere(`${aliases.createdBy}.id = :userId`, {
        userId: user.sub,
      });
    } else if (user.role === UserRole.DISTRICT_MANAGER) {
      qb.andWhere(`LOWER(${aliases.facility}.district) = :district`, {
        district: normalizeName(user.district),
      });
    } else if (user.role === UserRole.CITY_MANAGER) {
      qb.andWhere(`LOWER(${aliases.facility}.district) IN (:...districts)`, {
        districts: KIGALI_DISTRICTS_LOWER,
      });
    }

    if (filters.district) {
      qb.andWhere(`LOWER(${aliases.facility}.district) = :filterDistrict`, {
        filterDistrict: normalizeName(filters.district),
      });
    }
    if (filters.sector) {
      qb.andWhere(`LOWER(${aliases.facility}.sector) = :filterSector`, {
        filterSector: normalizeName(filters.sector),
      });
    }
    if (filters.officerId) {
      qb.andWhere(`${aliases.createdBy}.id = :officerId`, {
        officerId: filters.officerId,
      });
    }
    const visitType = this.resolveVisitType(filters.visitType);
    if (visitType) {
      qb.andWhere(`${aliases.inspection}.visitType = :visitType`, { visitType });
    }
    const decision = this.resolveDecision(filters.decision);
    if (decision) {
      qb.andWhere(`${aliases.inspection}.decision = :decision`, { decision });
    }
    const range = this.resolveDateRange(filters.startDate, filters.endDate);
    if (range.start) {
      qb.andWhere(`${aliases.inspection}.createdAt >= :startDate`, {
        startDate: range.start,
      });
    }
    if (range.end) {
      qb.andWhere(`${aliases.inspection}.createdAt <= :endDate`, {
        endDate: range.end,
      });
    }
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

  private resolveDateRange(startDate?: string | null, endDate?: string | null) {
    const range: { start?: Date; end?: Date } = {};
    if (startDate) {
      const start = new Date(startDate);
      if (!Number.isNaN(start.getTime())) {
        start.setHours(0, 0, 0, 0);
        range.start = start;
      }
    }
    if (endDate) {
      const end = new Date(endDate);
      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        range.end = end;
      }
    }
    return range;
  }

  private countRepeatOffenders(inspections: InspectionEntity[]) {
    const counts = new Map<string, number>();
    inspections.forEach((inspection) => {
      const key = inspection.facility?.id ?? inspection.facilityName;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.values()).filter((count) => count > 1).length;
  }

  private async getPeriodChangePct(
    user: { role: UserRole; district: string; sector: string; sub: string },
    filters: DashboardFilters,
  ) {
    const range = this.resolveDateRange(filters.startDate, filters.endDate);
    if (!range.start || !range.end) {
      return 0;
    }
    const days = Math.max(
      1,
      Math.round(
        (range.end.getTime() - range.start.getTime()) / (24 * 60 * 60 * 1000),
      ) + 1,
    );
    const prevEnd = new Date(range.start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    prevStart.setHours(0, 0, 0, 0);
    prevEnd.setHours(23, 59, 59, 999);
    const prevCount = await this.countInspections(user, {
      ...filters,
      startDate: prevStart.toISOString(),
      endDate: prevEnd.toISOString(),
    });
    const currentCount = await this.countInspections(user, filters);
    if (prevCount === 0) {
      return currentCount > 0 ? 100 : 0;
    }
    return Math.round(((currentCount - prevCount) / prevCount) * 100);
  }

  private async countInspections(
    user: { role: UserRole; district: string; sector: string; sub: string },
    filters: DashboardFilters,
  ) {
    const qb = this.inspectionsRepository
      .createQueryBuilder('inspection')
      .leftJoin('inspection.facility', 'facility')
      .leftJoin('inspection.createdBy', 'createdBy');
    this.applyInspectionFilters(qb, user, filters, {
      inspection: 'inspection',
      facility: 'facility',
      createdBy: 'createdBy',
    });
    return qb.getCount();
  }

  private groupByDate(inspections: InspectionEntity[]) {
    return inspections.reduce<Record<string, InspectionEntity[]>>((acc, inspection) => {
      const dateKey = inspection.createdAt.toISOString().slice(0, 10);
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(inspection);
      return acc;
    }, {});
  }

  private toDecisionSlug(decision: Decision) {
    switch (decision) {
      case Decision.WARNING:
        return 'warning';
      case Decision.CLOSURE_IMMEDIATE:
        return 'closure_immediate';
      case Decision.CLOSURE_DEADLINE:
        return 'closure_deadline';
      case Decision.PROSECUTION_RECOMMENDED:
        return 'prosecution_recommended';
      case Decision.NO_ACTION:
      default:
        return 'no_action';
    }
  }

  private toVisitTypeSlug(visitType: VisitType) {
    switch (visitType) {
      case VisitType.WARNING:
        return 'warning';
      case VisitType.FOLLOW_UP:
        return 'follow_up';
      case VisitType.COMPLIANCE:
        return 'compliance';
      case VisitType.FIRST:
      default:
        return 'first_visit';
    }
  }
}

export type DashboardFilters = {
  district?: string;
  sector?: string;
  officerId?: string;
  startDate?: string | null;
  endDate?: string | null;
  visitType?: string;
  decision?: string;
};
