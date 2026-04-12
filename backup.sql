--
-- PostgreSQL database dump
--

-- Dumped from database version 16.1
-- Dumped by pg_dump version 16.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: facilities_syncstatus_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.facilities_syncstatus_enum AS ENUM (
    'PENDING',
    'SYNCED',
    'CONFLICT'
);


--
-- Name: inspections_decision_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.inspections_decision_enum AS ENUM (
    'WARNING',
    'CLOSURE_IMMEDIATE',
    'CLOSURE_DEADLINE',
    'PROSECUTION_RECOMMENDED',
    'NO_ACTION'
);


--
-- Name: inspections_syncstatus_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.inspections_syncstatus_enum AS ENUM (
    'PENDING',
    'SYNCED',
    'CONFLICT'
);


--
-- Name: inspections_visittype_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.inspections_visittype_enum AS ENUM (
    'FIRST',
    'WARNING',
    'FOLLOW_UP',
    'COMPLIANCE'
);


--
-- Name: sms_logs_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sms_logs_status_enum AS ENUM (
    'PENDING',
    'SENT',
    'FAILED'
);


--
-- Name: users_role_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.users_role_enum AS ENUM (
    'HSO',
    'DISTRICT_MANAGER',
    'CITY_MANAGER',
    'SUPER_ADMIN',
    'ADMIN'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "userId" text,
    action character varying NOT NULL,
    "entityType" character varying NOT NULL,
    "entityId" text,
    before jsonb,
    after jsonb
);


--
-- Name: cells; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cells (
    "cellId" integer NOT NULL,
    "cellName" character varying NOT NULL,
    "sectorId" integer NOT NULL
);


--
-- Name: districts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.districts (
    "districtId" integer NOT NULL,
    "districtName" character varying NOT NULL,
    "provinceId" integer NOT NULL
);


--
-- Name: facilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facilities (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    name character varying NOT NULL,
    tin character varying NOT NULL,
    "ownerName" character varying NOT NULL,
    "ownerPhone" character varying NOT NULL,
    "ownerEmail" text,
    district character varying NOT NULL,
    sector character varying NOT NULL,
    cell character varying NOT NULL,
    village character varying NOT NULL,
    latitude double precision,
    longitude double precision,
    "photoPath" text,
    "syncStatus" public.facilities_syncstatus_enum DEFAULT 'SYNCED'::public.facilities_syncstatus_enum NOT NULL,
    "createdById" uuid
);


--
-- Name: faults; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faults (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    name character varying NOT NULL,
    "standardFine" integer NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "inspectionTypeId" uuid
);


--
-- Name: inspection_faults; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inspection_faults (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "faultName" character varying NOT NULL,
    "fineAmount" integer NOT NULL,
    "inspectionId" uuid,
    "faultId" uuid
);


--
-- Name: inspection_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inspection_types (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    code character varying NOT NULL,
    name character varying NOT NULL,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: inspections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inspections (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "facilityName" character varying NOT NULL,
    "visitType" public.inspections_visittype_enum NOT NULL,
    "teamMembers" text[] DEFAULT '{}'::text[] NOT NULL,
    "faultCount" integer DEFAULT 0 NOT NULL,
    "totalFine" integer DEFAULT 0 NOT NULL,
    "adjustmentAmount" integer DEFAULT 0 NOT NULL,
    "adjustmentReason" character varying DEFAULT ''::character varying NOT NULL,
    decision public.inspections_decision_enum NOT NULL,
    comments text DEFAULT ''::text NOT NULL,
    recommendations text DEFAULT ''::text NOT NULL,
    "syncStatus" public.inspections_syncstatus_enum DEFAULT 'SYNCED'::public.inspections_syncstatus_enum NOT NULL,
    "facilityId" uuid,
    "createdById" uuid,
    "inspectionTypeId" uuid,
    "photoPaths" text[] DEFAULT '{}'::text[] NOT NULL
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "tokenHash" character varying NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "revokedAt" timestamp with time zone,
    "userAgent" text,
    ip text,
    "userId" uuid
);


--
-- Name: sectors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sectors (
    "sectorId" integer NOT NULL,
    "sectorName" character varying NOT NULL,
    "districtId" integer NOT NULL
);


--
-- Name: sms_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sms_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    phone character varying NOT NULL,
    message text NOT NULL,
    status public.sms_logs_status_enum DEFAULT 'PENDING'::public.sms_logs_status_enum NOT NULL,
    "sentAt" timestamp with time zone,
    error text,
    "inspectionId" uuid
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "fullName" character varying NOT NULL,
    username character varying,
    phone character varying,
    role public.users_role_enum NOT NULL,
    district character varying NOT NULL,
    sector character varying NOT NULL,
    "passwordHash" character varying NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    email character varying NOT NULL,
    "activationCodeHash" text,
    "activationExpiresAt" timestamp with time zone,
    "activationUsedAt" timestamp with time zone
);


--
-- Name: villages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.villages (
    "villageId" integer NOT NULL,
    "villageName" character varying NOT NULL,
    "cellId" integer NOT NULL
);


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, "createdAt", "updatedAt", "userId", action, "entityType", "entityId", before, after) FROM stdin;
\.


--
-- Data for Name: cells; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cells ("cellId", "cellName", "sectorId") FROM stdin;
1010101	Akabahizi	10101
1010102	Akabeza	10101
1010103	Gacyamo	10101
1010104	Kigarama	10101
1010105	Kinyange	10101
1010106	Kora	10101
1010201	Nyamweru	10102
1010202	Nzove	10102
1010203	Taba	10102
1010301	Kigali	10103
1010302	Mwendo	10103
1010303	Nyabugogo	10103
1010304	Ruriba	10103
1010305	Rwesero	10103
1010401	Kamuhoza	10104
1010402	Katabaro	10104
1010403	Kimisagara	10104
1010501	Kankuba	10105
1010502	Kavumu	10105
1010503	Mataba	10105
1010504	Ntungamo	10105
1010505	Nyarufunzo	10105
1010506	Nyarurenzi	10105
1010507	Runzenze	10105
1010601	Amahoro	10106
1010602	Kabasengerezi	10106
1010603	Kabeza	10106
1010604	Nyabugogo	10106
1010605	Rugenge	10106
1010606	Tetero	10106
1010607	Ubumwe	10106
1010701	Munanira I	10107
1010702	Munanira Ii	10107
1010703	Nyakabanda I	10107
1010704	Nyakabanda Ii	10107
1010801	Cyivugiza	10108
1010802	Gasharu	10108
1010803	Mumena	10108
1010804	Rugarama	10108
1010901	Agatare	10109
1010902	Biryogo	10109
1010903	Kiyovu	10109
1010904	Rwampara	10109
1011001	Kabuguru I	10110
1011002	Kabuguru Ii	10110
1011003	Rwezamenyo I	10110
1011004	Rwezamenyo Ii	10110
1020101	Kinyaga	10201
1020102	Musave	10201
1020103	Mvuzo	10201
1020104	Ngara	10201
1020105	Nkuzuzu	10201
1020106	Nyabikenke	10201
1020107	Nyagasozi	10201
1020201	Karuruma	10202
1020202	Nyamabuye	10202
1020203	Nyamugari	10202
1020301	Gasagara	10203
1020302	Gicaca	10203
1020303	Kibara	10203
1020304	Munini	10203
1020305	Murambi	10203
1020401	Musezero	10204
1020402	Ruhango	10204
1020501	Akamatamu	10205
1020502	Bweramvura	10205
1020503	Kabuye	10205
1020504	Kidashya	10205
1020505	Ngiryi	10205
1020601	Agateko	10206
1020602	Buhiza	10206
1020603	Muko	10206
1020604	Nkusi	10206
1020605	Nyabuliba	10206
1020606	Nyakabungo	10206
1020607	Nyamitanga	10206
1020701	Kamatamu	10207
1020702	Kamutwa	10207
1020703	Kibaza	10207
1020801	Kamukina	10208
1020802	Kimihurura	10208
1020803	Rugando	10208
1020901	Bibare	10209
1020902	Kibagabaga	10209
1020903	Nyagatovu	10209
1021001	Gacuriro	10210
1021002	Gasharu	10210
1021003	Kagugu	10210
1021004	Murama	10210
1021101	Bwiza	10211
1021102	Cyaruzinge	10211
1021103	Kibenga	10211
1021104	Masoro	10211
1021105	Mukuyu	10211
1021106	Rudashya	10211
1021201	Butare	10212
1021202	Gasanze	10212
1021203	Gasura	10212
1021204	Gatunga	10212
1021205	Muremure	10212
1021206	Sha	10212
1021207	Shango	10212
1021301	Nyabisindu	10213
1021302	Nyarutarama	10213
1021303	Rukiri I	10213
1021304	Rukiri Ii	10213
1021401	Bisenga	10214
1021402	Gasagara	10214
1021403	Kabuga I	10214
1021404	Kabuga Ii	10214
1021405	Kinyana	10214
1021406	Mbandazi	10214
1021407	Nyagahinga	10214
1021408	Ruhanga	10214
1021501	Gasabo	10215
1021502	Indatemwa	10215
1021503	Kabaliza	10215
1021504	Kacyatwa	10215
1021505	Kibenga	10215
1021506	Kigabiro	10215
1030101	Gahanga	10301
1030102	Kagasa	10301
1030103	Karembure	10301
1030104	Murinja	10301
1030105	Nunga	10301
1030106	Rwabutenge	10301
1030201	Gatenga	10302
1030202	Karambo	10302
1030203	Nyanza	10302
1030204	Nyarurama	10302
1030301	Kagunga	10303
1030302	Kanserege	10303
1030303	Kinunga	10303
1030401	Kanserege	10304
1030402	Muyange	10304
1030403	Rukatsa	10304
1030501	Busanza	10305
1030502	Kabeza	10305
1030503	Karama	10305
1030504	Rubirizi	10305
1030601	Gasharu	10306
1030602	Kagina	10306
1030603	Kicukiro	10306
1030604	Ngoma	10306
1030701	Bwerankori	10307
1030702	Karugira	10307
1030703	Kigarama	10307
1030704	Nyarurama	10307
1030705	Rwampara	10307
1030801	Ayabaraya	10308
1030802	Cyimo	10308
1030803	Gako	10308
1030804	Gitaraga	10308
1030805	Mbabe	10308
1030806	Rusheshe	10308
1030901	Gatare	10309
1030902	Niboye	10309
1030903	Nyakabanda	10309
1031001	Kamashashi	10310
1031002	Nonko	10310
1031003	Rwimbogo	10310
\.


--
-- Data for Name: districts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.districts ("districtId", "districtName", "provinceId") FROM stdin;
101	NYARUGENGE	1
102	GASABO	1
103	KICUKIRO	1
\.


--
-- Data for Name: facilities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.facilities (id, "createdAt", "updatedAt", name, tin, "ownerName", "ownerPhone", "ownerEmail", district, sector, cell, village, latitude, longitude, "photoPath", "syncStatus", "createdById") FROM stdin;
afc17956-c61b-418c-822d-9daec181b08a	2026-04-06 19:02:21.749947	2026-04-06 19:02:21.749947	Mugabo Resto Bar	123456789	Nsengiyumva Olivier	+250722958263	\N	GASABO	GIKOMERO	Gasagara	Bwimiyange	37.4219983	-122.084	/data/user/0/com.moses.inspectionapp/files/photos/facility_1775487727733.jpg	SYNCED	c250a67a-b074-45e8-b667-b0788324a4a7
\.


--
-- Data for Name: faults; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.faults (id, "createdAt", "updatedAt", name, "standardFine", active, "inspectionTypeId") FROM stdin;
dc86b4c5-7553-4f52-9885-53e29278619e	2026-04-06 12:11:01.689739	2026-04-06 12:11:01.689739	Safe and potable water source available	10000	t	238fe36c-d10d-4bb2-8101-48bbfa8674e1
29b7c350-a933-49b6-ba00-154357a0b20b	2026-04-06 12:11:01.689739	2026-04-06 12:11:01.689739	Water storage containers are covered and clean	10000	t	238fe36c-d10d-4bb2-8101-48bbfa8674e1
46ab0e48-be73-4c2c-aff0-1714ec205d53	2026-04-06 12:11:01.689739	2026-04-06 12:11:01.689739	Drinking water is treated before use	10000	t	238fe36c-d10d-4bb2-8101-48bbfa8674e1
b4fd621b-c636-4786-8896-20116a8a1b9f	2026-04-06 12:11:01.689739	2026-04-06 12:11:01.689739	Residual chlorine is tested daily	10000	t	238fe36c-d10d-4bb2-8101-48bbfa8674e1
5ec85b04-4bb3-4615-ba87-3e9885cf85e7	2026-04-06 12:11:01.689739	2026-04-06 12:11:01.689739	Water supply pipes are free from leaks	10000	t	238fe36c-d10d-4bb2-8101-48bbfa8674e1
b7298683-644a-4290-90ff-a5837c6ca4e4	2026-04-06 12:11:01.689739	2026-04-06 12:11:01.689739	Handwashing stations have clean water	10000	t	238fe36c-d10d-4bb2-8101-48bbfa8674e1
90539d64-759c-4cb1-b970-d76e7c513555	2026-04-06 12:11:01.689739	2026-04-06 12:11:01.689739	Drinking water is stored separately	10000	t	238fe36c-d10d-4bb2-8101-48bbfa8674e1
c6cfe014-c7fa-4364-a5d5-39f2d1479d6a	2026-04-06 12:11:01.689739	2026-04-06 12:11:01.689739	No cross-connection between clean and wastewater	10000	t	238fe36c-d10d-4bb2-8101-48bbfa8674e1
a66e511b-0c6e-43db-9c07-f01e8203a043	2026-04-06 12:11:01.689739	2026-04-06 12:11:01.689739	Water tanks inspected in the last 6 months	10000	t	238fe36c-d10d-4bb2-8101-48bbfa8674e1
9fda7038-f255-4141-8854-4b04a28506e8	2026-04-06 12:11:01.689739	2026-04-06 12:11:01.689739	Water quality test records are available	10000	t	238fe36c-d10d-4bb2-8101-48bbfa8674e1
e6bdfe2e-ba26-4f62-91f0-ff588422abf8	2026-04-06 12:11:01.689739	2026-04-06 12:11:01.689739	Drainage around water points is clear	10000	t	238fe36c-d10d-4bb2-8101-48bbfa8674e1
60cadadc-6f38-4eef-b86d-2a4181e50298	2026-04-06 12:11:01.689739	2026-04-06 12:11:01.689739	No visible contamination at the water source	10000	t	238fe36c-d10d-4bb2-8101-48bbfa8674e1
4032b164-2b3b-4724-b5c7-ba592780f08a	2026-04-06 12:11:01.689739	2026-04-06 12:11:01.689739	Backflow prevention devices installed	10000	t	238fe36c-d10d-4bb2-8101-48bbfa8674e1
7078cfb9-3979-4de3-84c1-974af6002893	2026-04-06 12:11:01.689739	2026-04-06 12:11:01.689739	Water is free of unusual odor or color	10000	t	238fe36c-d10d-4bb2-8101-48bbfa8674e1
2f3c66ff-d4a1-4958-8af6-e5195d9e9b03	2026-04-06 12:11:01.689739	2026-04-06 12:11:01.689739	Tank cleaning schedule is documented	10000	t	238fe36c-d10d-4bb2-8101-48bbfa8674e1
\.


--
-- Data for Name: inspection_faults; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inspection_faults (id, "createdAt", "updatedAt", "faultName", "fineAmount", "inspectionId", "faultId") FROM stdin;
6ffdbfb1-a3af-4e3c-b7e6-a5da917c5543	2026-04-11 02:40:35.35963	2026-04-11 02:40:35.35963	Drinking water is treated before use	10000	0db1abff-1a6c-4d31-8d89-91b8a243e1dd	46ab0e48-be73-4c2c-aff0-1714ec205d53
c350449a-bace-4cb7-a44f-9d55b986a12c	2026-04-11 02:40:35.35963	2026-04-11 02:40:35.35963	No visible contamination at the water source	10000	0db1abff-1a6c-4d31-8d89-91b8a243e1dd	60cadadc-6f38-4eef-b86d-2a4181e50298
23107080-9ff2-47e6-82d4-0c6f343034a4	2026-04-11 16:03:59.135542	2026-04-11 16:03:59.135542	Water is free of unusual odor or color	10000	bbf8bc67-44fe-41e0-8b8a-49d90f5bcbb0	7078cfb9-3979-4de3-84c1-974af6002893
c7e18e15-50d5-4400-b3a4-aea81364c509	2026-04-11 16:03:59.135542	2026-04-11 16:03:59.135542	Drainage around water points is clear	10000	bbf8bc67-44fe-41e0-8b8a-49d90f5bcbb0	e6bdfe2e-ba26-4f62-91f0-ff588422abf8
7401c22f-6b2c-49a4-9729-f5702e41c58a	2026-04-11 16:03:59.135542	2026-04-11 16:03:59.135542	Water tanks inspected in the last 6 months	10000	bbf8bc67-44fe-41e0-8b8a-49d90f5bcbb0	a66e511b-0c6e-43db-9c07-f01e8203a043
098ad173-5614-402c-85c6-643b794f3d75	2026-04-11 16:03:59.135542	2026-04-11 16:03:59.135542	No cross-connection between clean and wastewater	10000	bbf8bc67-44fe-41e0-8b8a-49d90f5bcbb0	c6cfe014-c7fa-4364-a5d5-39f2d1479d6a
3c5f560b-8669-4a80-9b24-5445522230c7	2026-04-11 16:03:59.135542	2026-04-11 16:03:59.135542	Drinking water is treated before use	10000	bbf8bc67-44fe-41e0-8b8a-49d90f5bcbb0	46ab0e48-be73-4c2c-aff0-1714ec205d53
37e1c0fe-a2d3-4c68-b3a9-129a8a7341fb	2026-04-11 16:03:59.135542	2026-04-11 16:03:59.135542	Water storage containers are covered and clean	10000	bbf8bc67-44fe-41e0-8b8a-49d90f5bcbb0	29b7c350-a933-49b6-ba00-154357a0b20b
\.


--
-- Data for Name: inspection_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inspection_types (id, "createdAt", "updatedAt", code, name, active) FROM stdin;
f3558906-cec8-4796-84d7-801e55dd22da	2026-04-06 04:02:46.456964	2026-04-06 04:02:46.456964	FOOD_SAFETY	Food Safety (Restobar)	t
238fe36c-d10d-4bb2-8101-48bbfa8674e1	2026-04-06 04:02:46.456964	2026-04-06 04:02:46.456964	WATER_QUALITY	Water Quality	t
71413b2d-76eb-44c8-b50a-b8aba7f97f2b	2026-04-06 04:02:46.456964	2026-04-06 04:02:46.456964	SANITATION_HYGIENE	Sanitation & Hygiene	t
af15cb54-8b08-47d4-97cd-9d862f3b98f5	2026-04-06 04:02:46.456964	2026-04-06 04:02:46.456964	VECTOR_CONTROL	Vector Control	t
662a5294-446e-45dc-8e52-0611a4b50d11	2026-04-06 04:02:46.456964	2026-04-06 04:02:46.456964	SCHOOL_HEALTH	School Health	t
73faa9f3-c5a2-4e09-a895-cde27daa449a	2026-04-06 04:02:46.456964	2026-04-06 04:02:46.456964	HEALTHCARE_FACILITY	Healthcare Facility	t
7dd1c17e-7c71-4c84-8528-a5d70195bbe1	2026-04-06 04:02:46.456964	2026-04-06 04:02:46.456964	PUBLIC_BUILDING	Public Building	t
\.


--
-- Data for Name: inspections; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inspections (id, "createdAt", "updatedAt", "facilityName", "visitType", "teamMembers", "faultCount", "totalFine", "adjustmentAmount", "adjustmentReason", decision, comments, recommendations, "syncStatus", "facilityId", "createdById", "inspectionTypeId", "photoPaths") FROM stdin;
0db1abff-1a6c-4d31-8d89-91b8a243e1dd	2026-04-11 02:40:35.321903	2026-04-11 02:40:35.321903	Mugabo Resto Bar	FIRST	{"Meek Mill"}	2	20000	0		WARNING	- This is good and we have been waiting For it\n- Am doing my Best to Provide whatever I can do	1. dsfasdfasfas\n2. Asdfasfasdf\n3.	SYNCED	afc17956-c61b-418c-822d-9daec181b08a	c250a67a-b074-45e8-b667-b0788324a4a7	238fe36c-d10d-4bb2-8101-48bbfa8674e1	{}
bbf8bc67-44fe-41e0-8b8a-49d90f5bcbb0	2026-04-11 16:03:58.862469	2026-04-11 16:03:58.862469	Mugabo Resto Bar	FIRST	{"Meek Mill"}	6	60000	0		WARNING	- This is to ensure everything is being done and we are good\n- am on the Track to make sure we are in good position	1. The First recommendation is to use the ventilator\n2. Use the best cleaning techniques to be good at them	SYNCED	afc17956-c61b-418c-822d-9daec181b08a	c250a67a-b074-45e8-b667-b0788324a4a7	238fe36c-d10d-4bb2-8101-48bbfa8674e1	{}
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refresh_tokens (id, "createdAt", "updatedAt", "tokenHash", "expiresAt", "revokedAt", "userAgent", ip, "userId") FROM stdin;
69eee6ed-7b66-4535-809b-52eb23bfbb4e	2026-04-03 03:29:41.355036	2026-04-03 03:29:41.355036	d2884b4713376863e54b92309c9811ebffe41e79b57daa39ffe607f57489c23c	2026-05-03 03:29:41.313+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	5ffb813e-fce7-4214-af94-9c1b10ad21e0
5950b592-4e47-48ae-bf2e-b7dbb6ea9ae1	2026-04-04 01:25:08.415091	2026-04-04 01:25:08.415091	9791dac0e9381a78896e498008275d01eb7b22b8220d10b38798ecf3d823b0a7	2026-05-04 01:25:08.404+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
d4646591-5741-43ab-ad56-2ded5c3a0121	2026-04-04 01:49:10.591243	2026-04-04 01:49:10.591243	67592f63fa1b1e55dbf4691b48c133d9cf1ca1281f4d9482d8ec5375e4aa1e63	2026-05-04 01:49:10.588+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
f4aa84cb-2b0f-4107-9b01-c611a91c7640	2026-04-05 12:22:24.884769	2026-04-05 12:22:24.884769	ca6a3f26e9dcd15010ccbf658ce8cb940331683435111912f574573af9ff328b	2026-05-05 12:22:24.871+04	\N	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
281d51e1-b888-405c-b00f-f4c7a2b5d443	2026-04-05 13:25:04.424145	2026-04-05 13:25:04.424145	7ce7368efc6e7abb473c4667be7a295c39f4b466b5f656b4bde8267ceff3649d	2026-05-05 13:25:04.417+04	\N	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
aa1d8395-dead-4b78-bba8-0c318ad63d37	2026-04-05 15:40:52.124687	2026-04-05 15:40:52.124687	d55978e35199c482336888a1dd45c520729fd5921fe6fd24bf480438976eb8c8	2026-05-05 15:40:52.119+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
5e248204-5850-4ca9-93ef-a77618373985	2026-04-05 16:01:27.674181	2026-04-05 16:01:27.674181	1f31719e023d4e368e0e7da34ccf56e0a09143e5713e8810c6e528664978d8c4	2026-05-05 16:01:27.668+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
1d085f35-91b6-453d-b0b5-36fd51fb8d41	2026-04-05 18:35:35.192855	2026-04-05 18:35:35.192855	4134e5e683bf685f0265414a011984dd34b5653de9b3f9de9fd30bbc0a4008f3	2026-05-05 18:35:35.18+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
d865c787-06ed-4365-898f-9100eb55095d	2026-04-05 18:55:36.379247	2026-04-05 18:55:36.379247	67b9e8437cdc728d471290ad2858bc5290a85c38d921394b422540065b1094e0	2026-05-05 18:55:36.374+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
a86b1a8a-23e2-4e60-a80c-6016494ad847	2026-04-05 19:15:41.225261	2026-04-05 19:15:41.225261	1048f1b422436ed00d5a8e2d6e59398c75ae749ad96818c4aaf693d1b3cea775	2026-05-05 19:15:41.224+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
7b800065-7d56-4480-aaa7-49521f4cd84d	2026-04-05 19:15:41.21913	2026-04-05 19:15:41.21913	1048f1b422436ed00d5a8e2d6e59398c75ae749ad96818c4aaf693d1b3cea775	2026-05-05 19:15:41.207+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
6b47595a-834d-4aa8-8c24-526a80db7bd8	2026-04-05 19:36:44.557595	2026-04-05 19:36:44.557595	4231be65515712995d5b0fd2309ec9779dda6758282994e57712d7bab856483d	2026-05-05 19:36:44.541+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
ac28b330-6f71-4319-843b-68daa43439f7	2026-04-05 20:13:24.471808	2026-04-05 20:13:24.471808	5e56be95756f7167115e3caa3f7d29ead00bc460ef8db458ff4c35dd51a9b4cb	2026-05-05 20:13:24.444+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
3fe297a1-828a-4a60-b4ed-ff277f1dc0ec	2026-04-05 20:52:07.382662	2026-04-05 20:52:07.382662	bc869ee51ab5bb9c3851f765d24eace1223278cec2b79fb802a13a451ec9809f	2026-05-05 20:52:07.373+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
f50f19b1-6f3b-4b04-b2e6-f092d6a0d77a	2026-04-05 21:43:13.234212	2026-04-05 21:43:13.234212	fa45e3e6d90737610de166d50632df51cc45ab9ed5e8139fe9de3541bf900d00	2026-05-05 21:43:13.232+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
ca810373-7e97-4eba-adf7-accdf7c6ea0e	2026-04-05 22:03:31.711665	2026-04-05 22:03:31.711665	d9ed7b2d7dfb2f38195e7f5e21abab5cb14ca7abdc4ca657e3474247a8bc1341	2026-05-05 22:03:31.705+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
c8e6f997-3864-414c-9577-fd6bd1798bd3	2026-04-06 00:16:43.43836	2026-04-06 00:16:43.43836	4e182e6113a9168c9af2da1ad8d9e290ac2527169bb2e736fee0f829dc6a026e	2026-05-06 00:16:43.435+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
b73af425-a3a4-4ec0-b46e-4a195130719a	2026-04-06 00:52:15.132896	2026-04-06 00:52:15.132896	064841f5b85c62ec51229025e67a4298cab2c31548657f865b9c81250f3d1a84	2026-05-06 00:52:15.127+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
3c38fdfb-6117-4644-860b-394273d7db46	2026-04-06 02:14:40.123824	2026-04-06 02:14:40.123824	8bc72d8ec987560f8bdab56749d3cbbea61b44e3fb57ac05aa3222e5f1536136	2026-05-06 02:14:40.117+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
8d53b6fa-3e08-4f88-a910-b85ce6d0f55b	2026-04-06 02:46:23.006336	2026-04-06 02:46:23.006336	a40de831152cb0abca42b19eda8639c26b82c9aabb5c0075364c6a5d408a8be0	2026-05-06 02:46:22.999+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
14907a3e-8d81-49d5-8562-0d463cc34a63	2026-04-06 12:04:29.623969	2026-04-06 12:04:29.623969	e0f16188af89d85ef3788ef831f6920786ee95a5355b0b107b5c54dd0bae2cc3	2026-05-06 12:04:29.621+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
779cc29e-e5af-4034-aab7-1e5dbd79ad6a	2026-04-06 12:04:47.773645	2026-04-06 12:04:47.773645	8e5adcd56aa3444ce10128d4a0595e3a04c23bb733a27aeb5a10039650d9b8f9	2026-05-06 12:04:47.772+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::ffff:127.0.0.1	718c2b5d-f049-4c2d-aea7-ac31a15c80cb
e7bff37e-624a-42b2-9017-8bcbf7b87229	2026-04-06 12:25:23.515324	2026-04-06 12:25:23.515324	0c5f558a80de10f34e67df88a613613dfe2b6ae2af63ff6183031357b252771f	2026-05-06 12:25:23.511+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::ffff:127.0.0.1	718c2b5d-f049-4c2d-aea7-ac31a15c80cb
50f988d0-4eba-4122-9d29-a53666e52533	2026-04-06 15:56:30.971992	2026-04-06 15:56:30.971992	165b5a859b1ce3da44bce104984119b91507cd304ece098996f71a3d3ecffb2f	2026-05-06 15:56:30.953+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
d20a8d07-1e63-48fb-902d-63766d1c4282	2026-04-06 18:35:47.884778	2026-04-06 18:35:47.884778	9e427aa7a3c974800fa5d38ca01ea22e81d38415f8a0ac33d1be57b03c819d3b	2026-05-06 18:35:47.874+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
c71b67c4-8e1d-4976-a7de-1119f7be1c6d	2026-04-06 18:41:10.91518	2026-04-06 18:41:10.91518	4044293f693e7e60518aa91d3142aee8482a1bac179f38ed2646f355a6f94510	2026-05-06 18:41:10.912+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
a9b816fc-c9d3-4af6-bbb8-c16b47848b0e	2026-04-06 18:43:40.89972	2026-04-06 18:43:40.89972	9f250c283133fc7064e9f8c5fd6ab7bc65f6954f10d59bb9f965e1ba283c6a9c	2026-05-06 18:43:40.896+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
62512a8e-3af3-4034-b858-466c119bd929	2026-04-06 19:01:15.94406	2026-04-06 19:01:15.94406	c6b007f631a4c1730488e63960f9734d243f4e8c47e214aae3ec35c59494e7e9	2026-05-06 19:01:15.938+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
dc5a9190-7383-4c6c-9f6a-f1bed2235cd7	2026-04-06 19:16:14.086821	2026-04-06 19:16:14.086821	4cddb7c9039ceb7e176c815a298286555831e2eefcb39d8cd67a09dccac416ab	2026-05-06 19:16:14.071+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
9dccf671-62fe-41d6-92ee-2fbd3054ffab	2026-04-06 19:19:57.823654	2026-04-06 19:19:57.823654	f39c5ba1cdad5babf8a01335095563443008bd63b9d68d97d885b2a05b35169f	2026-05-06 19:19:57.819+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
1a995bb6-2215-4b5c-ae63-a05e19544d8d	2026-04-06 19:41:11.851091	2026-04-06 19:41:11.851091	5f95f7dd0eaa14988106dce35c595372269301c299d62ac51e96407621db5335	2026-05-06 19:41:11.844+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
747f4bec-e61a-41f7-8423-0ea365b093a7	2026-04-06 20:02:32.81631	2026-04-06 20:02:32.81631	94771a697ea828146d40978058354dcfa4e6cc85c598811656ed35f135b09aa0	2026-05-06 20:02:32.814+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
50f23431-85aa-406b-b206-d17a8b163188	2026-04-09 13:13:24.298489	2026-04-09 13:13:24.298489	ff2eec92bc0e1db37fca1873fe972d52dfd056861aedc670d20e5e7f761fdc9b	2026-05-09 13:13:24.239+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
05dff310-7a21-4920-815f-6ae3c19be7b3	2026-04-09 13:34:01.151129	2026-04-09 13:34:01.151129	0abeda32ab39c9ccee7914ebb2ec0685b909b17603b87964192fbf91da814021	2026-05-09 13:34:01.139+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
e7993f73-fd08-4619-ab5e-7bd719bae468	2026-04-09 13:42:02.078655	2026-04-09 13:42:02.078655	f5d0fd5e2996d2cc6a47cc1d26c671fb4d239b23a5d4f82a67e9ed3e82e48de9	2026-05-09 13:42:02.073+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	c250a67a-b074-45e8-b667-b0788324a4a7
e7aba521-3522-48ef-a720-a7e7af5036f0	2026-04-09 14:09:16.288471	2026-04-09 14:09:16.288471	9536bb0896cd6a5e4d3e9058f8a17921468772bcc3929c70b10388028b4db97e	2026-05-09 14:09:16.284+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::1	c250a67a-b074-45e8-b667-b0788324a4a7
0fb10ff7-8305-46d3-85e3-2cef0adc8e2d	2026-04-09 14:27:35.868062	2026-04-09 14:27:35.868062	a5b87812cdff68dc91f3d846707627568d758e083c171139756acab46dcf3ccb	2026-05-09 14:27:35.847+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
1022a72c-dd61-4470-98c7-cb38d158394b	2026-04-09 16:31:02.829105	2026-04-09 16:31:02.829105	5e740febd861952009430235908dccce08219427ea14ac5cf73a27f7aa4f4458	2026-05-09 16:31:02.818+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
31c8e873-1581-46d8-bc42-b1c32ed896cd	2026-04-09 17:33:31.552104	2026-04-09 17:33:31.552104	e869598ce9f5519b58c22e174d925c5ab6c912481a219103b8d8c6d75caa2d7d	2026-05-09 17:33:31.546+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
be39f2d4-ae37-46d2-a00c-8619c4163faf	2026-04-09 17:55:44.370349	2026-04-09 17:55:44.370349	d9f3bf95dcdc8f36d14201bae5286b16791c8b6d63a92cd282bebd9d80228a10	2026-05-09 17:55:44.362+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
315edf9f-9a47-428c-8d82-17deaa450812	2026-04-09 18:14:48.725559	2026-04-09 18:14:48.725559	d556ae8ce2eebfe4c529e71feb9217fcac3446e208eaef5b8155bd52dad7930d	2026-05-09 18:14:48.706+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
63180576-c606-47b6-8454-6180aa3a2f0b	2026-04-09 18:21:27.686414	2026-04-09 18:21:27.686414	8333ec267c410e887dee824a4b9501f0b5a562bd9ea8545a8bddec6f00e56a31	2026-05-09 18:21:27.684+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
d9f9a4c3-aad3-4105-8add-09ee032edbc7	2026-04-09 18:33:50.36107	2026-04-09 18:33:50.36107	5c0a44870512372e5a3186e79f223b3f1dcbab1af9d8a646013c9e6af5d58110	2026-05-09 18:33:50.352+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
509e1b47-37b8-48ef-961b-93080b5ea1be	2026-04-10 00:24:29.679958	2026-04-10 00:24:29.679958	cc78ddab941b3c0b7323744b99e3fa5de1c3ee64a9c6531fa71e6f7a5278ea4a	2026-05-10 00:24:29.677+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
08f5568b-32de-4dc6-85e0-b526e7758b1c	2026-04-10 00:44:16.162628	2026-04-10 00:44:16.162628	62530bcbe93e119afc47c1605a8d60cbfd3b2578e15cec441f93032d61c9fe3c	2026-05-10 00:44:16.158+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
a2f230ce-dafe-46ae-be52-751e44a7774b	2026-04-10 00:52:21.621108	2026-04-10 00:52:21.621108	d0a741c4b0055e04a8d43ed68901b98e04bed9926fdbaec46683d9e4aa67f778	2026-05-10 00:52:21.611+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
e622921c-7f49-414d-87a5-7d85f736a444	2026-04-10 01:47:24.921133	2026-04-10 01:47:24.921133	8bf2a707364d6819a32263a5a2299c39e7f4051e53878c5d722418bb3b2ff8a1	2026-05-10 01:47:24.919+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
4c003d5c-8ab1-4c17-863c-87ac4fcf7846	2026-04-10 02:20:49.818842	2026-04-10 02:20:49.818842	bb47c3f3a509ee52d6df39398a75f19efdc807acc8875b07ab98daa59f5dd592	2026-05-10 02:20:49.816+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
c7b3ff95-2afd-444e-b347-d2967d74a137	2026-04-10 03:44:16.808958	2026-04-10 03:44:16.808958	9fa4e113ec9bd2848c422708cc850d7f60a338a246194b92f14e222dc92ba153	2026-05-10 03:44:16.805+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
34ec94a7-6e4f-4c48-9ff1-67592aa5169f	2026-04-10 06:26:59.95676	2026-04-10 06:26:59.95676	eff7f769deadc9821d35243d57b9c77a5173bb3db7e3b516f385fe3313cbea56	2026-05-10 06:26:59.953+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
2e7c7f17-5f5c-4f62-9ffc-d005acb11452	2026-04-10 15:00:13.400296	2026-04-10 15:00:13.400296	187526c276e8a95267d29786f02dd327e5f2b0096ce222678c877a45508cda75	2026-05-10 15:00:13.393+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
76d1052c-2a55-4e8f-b7e8-822254e0a7cf	2026-04-10 15:18:45.066826	2026-04-10 15:18:45.066826	45c2c31a7cdcfb31cd7ffe9b2d6d0e26243c55b6cd6b11775c4c305fa9741c85	2026-05-10 15:18:45.06+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
43de0793-0fae-48cc-9c77-5fed00b99476	2026-04-10 15:22:01.188483	2026-04-10 15:22:01.188483	8d063fecad96e9cc5b96d7c02a8b4244cca53c6e51f9be59b216cded626d7ec6	2026-05-10 15:22:01.184+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
fc47b454-c839-4489-beda-11fcbfce2953	2026-04-10 15:48:33.305826	2026-04-10 15:48:33.305826	352fa90c6fbc6e9fa684c6cdd39058672ed8bc69e55de6661ec8c44c2cd40b49	2026-05-10 15:48:33.303+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
51a16580-b0f7-4b43-b50c-9093119f30cf	2026-04-10 15:54:29.807409	2026-04-10 15:54:29.807409	906853b5f5462add5df9a59d0b12bacb55e9fb5b527e1bb61b3d0f1ef083eb49	2026-05-10 15:54:29.803+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	::ffff:127.0.0.1	718c2b5d-f049-4c2d-aea7-ac31a15c80cb
1e7a4793-3a36-4a3c-8a8f-eff5aface36a	2026-04-10 15:54:57.664866	2026-04-10 15:54:57.664866	c7186c72c2cf8a78eefef9d1735f0f4a2d9d47678854e7572bc56b97a4c427f5	2026-05-10 15:54:57.663+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
35ab1a0a-8ab2-47f7-b223-dff1632d00d4	2026-04-10 18:07:34.813493	2026-04-10 18:07:34.813493	0786b9ae4636447d6705523e6f99fb2adf27ebe73a588473a7b3a4cd6496e244	2026-05-10 18:07:34.807+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
fc6c0544-bd13-443d-bae6-1350854fa96a	2026-04-11 01:48:27.080077	2026-04-11 01:48:27.080077	8ce1b8273043776d5684ae5305cb918e3784bdd80636b073506b96b416f9ac67	2026-05-11 01:48:27.067+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
dbd3191f-9161-4803-aa8d-8f6f0ced6414	2026-04-11 02:07:57.838931	2026-04-11 02:07:57.838931	e9faef12669c3be95d4e33db0a90b3513a309e6251a1650a060b4454c2bee1ab	2026-05-11 02:07:57.812+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
834e1fbd-bc54-42be-80a4-f51f48049d4d	2026-04-11 02:13:31.411113	2026-04-11 02:13:31.411113	bf7cf52506c797115c952c10ea2c0bbb2940768984638f71cd092a63c003d1f7	2026-05-11 02:13:31.408+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
c958f1e7-bad0-412e-acc1-1c78f14be020	2026-04-11 02:38:22.631752	2026-04-11 02:38:22.631752	846015881eff588cae93463354c7377115e7d991f8888339d638a642850f024f	2026-05-11 02:38:22.627+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
a816fa34-333a-46e6-993e-cd4412b00af8	2026-04-11 02:45:07.760219	2026-04-11 02:45:07.760219	8f17f04d18c2dad759db5528302194def80e91f87a1345778fcef970c995781f	2026-05-11 02:45:07.754+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
0332262c-df41-4c20-9420-fbc772330f69	2026-04-11 04:08:27.192295	2026-04-11 04:08:27.192295	74148e2877529185c339c76b47891104d1e8021d483be24847775b947dcee00a	2026-05-11 04:08:27.187+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
cffcbc3b-45dd-4813-9648-2570e4f9c5d7	2026-04-11 04:59:39.473779	2026-04-11 04:59:39.473779	011382162dc93aab6663b1690d40d9bd83db54d659710d7d211a0951cd3d7db3	2026-05-11 04:59:39.466+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
f687e717-e122-4e5f-829d-83eb3e6f8204	2026-04-11 12:36:19.725549	2026-04-11 12:36:19.725549	84f4d4f7bad535b0fe7d0f7477fb989d46bb123c911fd9d18fbe0a35a6a08ce1	2026-05-11 12:36:19.705+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
75499b12-8fdc-4f9a-b34d-71b04caa2406	2026-04-11 15:50:06.151804	2026-04-11 15:50:06.151804	fbf3be99caa9949ceeb929794739a28f3c187cbafbdfb86e29562d38ff77e062	2026-05-11 15:50:06.142+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
fb8eabb6-dcc8-476f-bdd4-4d9fb8d6fefe	2026-04-11 16:00:35.843893	2026-04-11 16:00:35.843893	283611c7f7e4c6a90266c1ccad6ba4511ba9a8fc21d97b819a01878a99c3e882	2026-05-11 16:00:35.841+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
de24d122-66b8-4a12-a4d0-9f55af68cdc7	2026-04-11 16:33:54.260965	2026-04-11 16:33:54.260965	95235667e41eed3fbd14a38a74aa0f920e73f6bd82d8876182deaa9c2132ba5b	2026-05-11 16:33:54.254+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
a1f2d56c-8987-4ed5-a1c3-bc188862aca2	2026-04-11 16:38:26.220442	2026-04-11 16:38:26.220442	009f932fd2eb779bc6a1c60be3003440fb7b9731e7a9262e5213bfc0616d2a2e	2026-05-11 16:38:26.219+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
0314dcec-b9fb-4239-845e-b143b863517d	2026-04-11 20:45:18.069439	2026-04-11 20:45:18.069439	adf6b8bdc61e7dad3dad47518227d3b081c7b02e4db1402a687b63cb6b09f79a	2026-05-11 20:45:18.067+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
f9d11344-8820-45cb-a2bc-dc98496d7a64	2026-04-11 23:45:26.517289	2026-04-11 23:45:26.517289	0e351c334c355f1f5d99a4d205efa955d32b588338b28d28f9f1f98afe7c63b1	2026-05-11 23:45:26.498+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
f5ef9979-22cf-4b0c-848a-0def2013d119	2026-04-12 00:19:53.520973	2026-04-12 00:19:53.520973	c50aa9b25d4359af9719a5f09336fcce87030462b387ca159c10a1a6c44dd5ee	2026-05-12 00:19:53.513+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
22a0579c-9509-4d68-b5dd-bbf8a50617f3	2026-04-12 01:20:52.853303	2026-04-12 01:20:52.853303	1545e329a9ee19c0a0f770da76e27ed8cc3e3f6b0af3ce53ff9e76cd5a517477	2026-05-12 01:20:52.841+04	\N	okhttp/4.12.0	::ffff:127.0.0.1	c250a67a-b074-45e8-b667-b0788324a4a7
357fe57d-4778-4820-b1bb-d92dc33cfc9e	2026-04-12 01:21:54.06805	2026-04-12 01:21:54.06805	429a9367595726ce43ead52e4575228ddd4076da4127fd51878b3612c7673b0a	2026-05-12 01:21:54.067+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
ae7cdf8c-b92a-4050-8e68-c5d9bb7e2a98	2026-04-12 02:02:57.550535	2026-04-12 02:02:57.550535	dcff612265b17346b2c89f029980ddd8f40f811748f9d69fd650c1d8f1e0fcc1	2026-05-12 02:02:57.546+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
beba593c-a086-48d0-b1d3-8ab888326f85	2026-04-12 02:33:49.031282	2026-04-12 02:33:49.031282	37116848dc3e9395ff2d60ad9e62efa268c70229537f6b1c5b1c94455ca1f403	2026-05-12 02:33:49.019+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
ce7d3b09-c17f-4624-9d69-14bd0148612a	2026-04-12 13:05:04.276312	2026-04-12 13:05:04.276312	34c5590a2a2ec7180974557d107ffede2cc065c4d84797c0ea55085e9ff7e22e	2026-05-12 13:05:04.265+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
2b42c671-3847-443e-b53a-b9c3a1e05731	2026-04-12 13:26:49.312208	2026-04-12 13:26:49.312208	343b306b6aadeb2d2d66c2943920ee6121dc8cf28b45e2d412cff3783cc5e7ee	2026-05-12 13:26:49.301+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
622f6fe0-d5fa-41a5-96e7-8979bb60a4f6	2026-04-12 13:51:34.79638	2026-04-12 13:51:34.79638	88ced4209c80e77cfcc3406b650e53ac68edcfe44d6b2475b5ab470d0dcb320c	2026-05-12 13:51:34.779+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
f536f5a7-9b07-4e7e-b212-0f26bbd2ad37	2026-04-12 14:11:57.044712	2026-04-12 14:11:57.044712	6c37e7a155309672f3eedc380492eea05d5f0aed9b9e651ca97e3af250b5f319	2026-05-12 14:11:57.041+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
115a4b20-f2d5-49f2-bd7c-8963e485727c	2026-04-12 14:19:27.691966	2026-04-12 14:19:27.691966	92b9ad3f0aae93fc8230adffc83cd4274eb7a852e5caa07ec2f2d9ab8826c2c8	2026-05-12 14:19:27.69+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
d1189116-ec55-4cf1-8895-102cf77a6045	2026-04-12 14:44:58.45689	2026-04-12 14:44:58.45689	21c9a354d11c1823a107e4e2cf7fc6e88f63fad34e5fb1c76619a2a2c715e9b2	2026-05-12 14:44:58.452+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
c4d8793c-0325-4064-adcb-93459b701a2e	2026-04-12 14:45:29.790794	2026-04-12 14:45:29.790794	b2f1a2a0eeb27b5c6c3c1faaca0a91838a4044fea935888cc7bd2ef374b1f080	2026-05-12 14:45:29.788+04	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	::ffff:127.0.0.1	05c60d88-12b3-4939-b5a2-32b750c5149a
\.


--
-- Data for Name: sectors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sectors ("sectorId", "sectorName", "districtId") FROM stdin;
10101	GITEGA	101
10102	KANYINYA	101
10103	KIGALI	101
10104	KIMISAGARA	101
10105	MAGERAGERE	101
10106	MUHIMA	101
10107	NYAKABANDA	101
10108	NYAMIRAMBO	101
10109	NYARUGENGE	101
10110	RWEZAMENYO	101
10201	BUMBOGO	102
10202	GATSATA	102
10203	GIKOMERO	102
10204	GISOZI	102
10205	JABANA	102
10206	JALI	102
10207	KACYIRU	102
10208	KIMIHURURA	102
10209	KIMIRONKO	102
10210	KINYINYA	102
10211	NDERA	102
10212	NDUBA	102
10213	REMERA	102
10214	RUSORORO	102
10215	RUTUNGA	102
10301	GAHANGA	103
10302	GATENGA	103
10303	GIKONDO	103
10304	KAGARAMA	103
10305	KANOMBE	103
10306	KICUKIRO	103
10307	KIGARAMA	103
10308	MASAKA	103
10309	NIBOYE	103
10310	NYARUGUNGA	103
\.


--
-- Data for Name: sms_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sms_logs (id, "createdAt", "updatedAt", phone, message, status, "sentAt", error, "inspectionId") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, "createdAt", "updatedAt", "fullName", username, phone, role, district, sector, "passwordHash", "isActive", email, "activationCodeHash", "activationExpiresAt", "activationUsedAt") FROM stdin;
c250a67a-b074-45e8-b667-b0788324a4a7	2026-04-05 20:18:01.798355	2026-04-06 00:16:43.386788	Meek Mill	\N		HSO	Gasabo	GIKOMERO	$2a$10$Z0EakG73X6hOJGVFQzkae.uqBaDPYoyExScikenuIgBTURxcylTn6	t	gmel29206@gmail.com	\N	\N	2026-04-06 00:16:43.346+04
5ffb813e-fce7-4214-af94-9c1b10ad21e0	2026-04-03 01:56:44.114923	2026-04-12 15:01:49.037508	Alice Inspector	inspector	\N	HSO	Gasabo	Kacyiru	$2a$10$AghgrBErt3fVGrvbVXTM/.Uhy86YsKyiYpppFD3JUy0PqS2a7o5Ca	t	hso.gasabo@kigali.rw	\N	\N	\N
05c60d88-12b3-4939-b5a2-32b750c5149a	2026-04-03 02:03:22.175211	2026-04-12 15:01:49.214435	David Manager	district_manager	\N	DISTRICT_MANAGER	Gasabo	Kacyiru	$2a$10$YaJJZI3jTC9duih9jhYNoOCUJ.26.EKK8z41TUOn0hMa9LoEZnF4G	t	district_manager@example.com	\N	\N	\N
6388491f-cdfd-432d-923d-2cc59ec3bb73	2026-04-04 01:09:22.17762	2026-04-12 15:01:49.376231	Caroline City	city_manager	\N	CITY_MANAGER	Kigali	City HQ	$2a$10$hd2oCey16LzfMj8l7EHpz.GnW5orZdO3WoTdeccik7IFtGHhCyJHW	t	city.manager@kigali.rw	\N	\N	\N
718c2b5d-f049-4c2d-aea7-ac31a15c80cb	2026-04-04 01:09:22.570113	2026-04-12 15:01:49.502396	Super Admin	super_admin	\N	SUPER_ADMIN	Kigali	Head Office	$2a$10$9NwcXZFTn0.G8tY79rDSRuSdNW7NmIhpy3kEEx5o.jWFy4YZu4jhy	t	super.admin@kigali.rw	\N	\N	\N
\.


--
-- Data for Name: villages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.villages ("villageId", "villageName", "cellId") FROM stdin;
101010102	Gihanga	1010101
101010103	Iterambere	1010101
101010104	Izuba	1010101
101010105	Nyaburanga	1010101
101010106	Nyenyeri	1010101
101010107	Ubukorikori	1010101
101010108	Ubumwe	1010101
101010109	Ubwiyunge	1010101
101010110	Umucyo	1010101
101010111	Umurabyo	1010101
101010112	Umuseke	1010101
101010113	Vugizo	1010101
101010201	Akinyambo	1010102
101010202	Amayaga	1010102
101010203	Gitwa	1010102
101010204	Ituze	1010102
101010205	Mpazi	1010102
101010301	Amahoro	1010103
101010302	Impuhwe	1010103
101010303	Intsinzi	1010103
101010304	Kivumu	1010103
101010305	Ubumwe	1010103
101010306	Urukundo	1010103
101010307	Ururembo	1010103
101010401	Ingenzi	1010104
101010402	Sangwa	1010104
101010403	Umubano	1010104
101010404	Umucyo	1010104
101010405	Umuhoza	1010104
101010406	Umurava	1010104
101010501	Akabugenewe	1010105
101010502	Ihuriro	1010105
101010503	Isangano	1010105
101010504	Isano	1010105
101010505	Karitasi	1010105
101010506	Ubumanzi	1010105
101010507	Uburezi	1010105
101010508	Ubwiza	1010105
101010509	Umucyo	1010105
101010510	Umwembe	1010105
101010511	Urugano	1010105
101010601	Isangano	1010106
101010602	Kanunga	1010106
101010603	Kinyambo	1010106
101010604	Kivumu	1010106
101010605	Kora	1010106
101010606	Mpazi	1010106
101010607	Rugano	1010106
101010608	Rugari	1010106
101010609	Ubumwe	1010106
101020101	Bwimo	1010201
101020102	Gatare	1010201
101020103	Mubuga	1010201
101020104	Nyakirambi	1010201
101020105	Nyamweru	1010201
101020106	Ruhengeri	1010201
101020201	Bibungo	1010202
101020202	Bwiza	1010202
101020203	Gateko	1010202
101020204	Kagasa	1010202
101020205	Nyabihu	1010202
101020206	Rutagara I	1010202
101020207	Rutagara Ii	1010202
101020208	Ruyenzi	1010202
101020301	Kagaramira	1010203
101020302	Ngendo	1010203
101020303	Nyarurama	1010203
101020304	Nyarusange	1010203
101020305	Rwakivumu	1010203
101020306	Taba	1010203
101030101	Akirwanda	1010301
101030102	Gisenga	1010301
101030103	Kadobogo	1010301
101030104	Kagarama	1010301
101030105	Kibisogi	1010301
101030106	Muganza	1010301
101030107	Murama	1010301
101030108	Rubuye	1010301
101030109	Ruhango	1010301
101030110	Ryasharangabo	1010301
101030201	Agakomeye	1010302
101030202	Akagugu	1010302
101030203	Amahoro	1010302
101030204	Amajyambere	1010302
101030205	Birambo	1010302
101030206	Isangano	1010302
101030207	Kanyabami	1010302
101030208	Karambo	1010302
101030209	Mwendo	1010302
101030210	Ruhuha	1010302
101030211	Ubuzima	1010302
101030212	Umutekano	1010302
101030301	Gakoni	1010303
101030302	Gatare	1010303
101030303	Giticyinyoni	1010303
101030304	Kadobogo	1010303
101030305	Kamenge	1010303
101030306	Karama	1010303
101030307	Kiruhura	1010303
101030308	Nyabikoni	1010303
101030309	Nyabugogo	1010303
101030310	Ruhondo	1010303
101030401	Misibya	1010304
101030402	Nyabitare	1010304
101030403	Ruhango	1010304
101030404	Ruharabuge	1010304
101030405	Ruriba	1010304
101030406	Ruzigimbogo	1010304
101030407	Ryamakomari	1010304
101030408	Tubungo	1010304
101030501	Akanyamirambo	1010305
101030502	Akinama	1010305
101030503	Makaga	1010305
101030504	Musimba	1010305
101030505	Ruhogo	1010305
101030506	Rwesero	1010305
101030507	Rweza	1010305
101030508	Vuganyana	1010305
101040101	Buhoro	1010401
101040102	Busasamana	1010401
101040103	Isimbi	1010401
101040104	Ituze	1010401
101040105	Karama	1010401
101040106	Karwarugabo	1010401
101040107	Kigabiro	1010401
101040108	Mataba	1010401
101040109	Munini	1010401
101040110	Ntaraga	1010401
101040111	Nunga	1010401
101040112	Rurama	1010401
101040113	Rutunga	1010401
101040114	Tetero	1010401
101040201	Akamahoro	1010402
101040202	Akishinge	1010402
101040203	Akishuri	1010402
101040204	Amahumbezi	1010402
101040205	Inganzo	1010402
101040206	Kigarama	1010402
101040207	Mpazi	1010402
101040208	Mugina	1010402
101040209	Ubumwe	1010402
101040210	Ubusabane	1010402
101040211	Umubano	1010402
101040212	Umurinzi	1010402
101040213	Uruyange	1010402
101040301	Akabeza	1010403
101040302	Amahoro	1010403
101040303	Birama	1010403
101040304	Buhoro	1010403
101040305	Bwiza	1010403
101040306	Byimana	1010403
101040307	Gakaraza	1010403
101040308	Gaseke	1010403
101040309	Ihuriro	1010403
101040310	Inkurunziza	1010403
101040311	Karambi	1010403
101040312	Kigina	1010403
101040313	Kimisagara	1010403
101040314	Kove	1010403
101040315	Muganza	1010403
101040316	Nyabugogo	1010403
101040317	Nyagakoki	1010403
101040318	Nyakabingo	1010403
101040319	Nyamabuye	1010403
101040320	Sangwa	1010403
101040321	Sano	1010403
101050101	Kamatamu	1010501
101050102	Kankuba	1010501
101050103	Karukina	1010501
101050104	Musave	1010501
101050105	Nyarumanga	1010501
101050106	Rugendabari	1010501
101050201	Ayabatanga	1010502
101050202	Kankurimba	1010502
101050203	Kavumu	1010502
101050204	Mubura	1010502
101050205	Murondo	1010502
101050206	Nyakabingo	1010502
101050207	Nyarubuye	1010502
101050301	Burema	1010503
101050302	Gahombo	1010503
101050303	Kabeza	1010503
101050304	Karambi	1010503
101050305	Kwisanga	1010503
101050306	Mageragere	1010503
101050307	Mataba	1010503
101050308	Rushubi	1010503
101050401	Akanakamageragere	1010504
101050402	Gatovu	1010504
101050403	Nyabitare	1010504
101050404	Nyarubande	1010504
101050405	Rubungo	1010504
101050406	Rwindonyi	1010504
101050501	Akabungo	1010505
101050502	Akamashinge	1010505
101050503	Maya	1010505
101050504	Nyarufunzo	1010505
101050505	Nyarurama	1010505
101050506	Rubete	1010505
101050601	Amahoro	1010506
101050602	Ayabaramba	1010506
101050603	Gikuyu	1010506
101050604	Iterambere	1010506
101050605	Nyabirondo	1010506
101050606	Nyarurenzi	1010506
101050701	Gisunzu	1010507
101050702	Mpanga	1010507
101050703	Nkomero	1010507
101050704	Runzenze	1010507
101050705	Uwurugenge	1010507
101060101	Amahoro	1010601
101060102	Amizero	1010601
101060103	Inyarurembo	1010601
101060104	Kabirizi	1010601
101060105	Ubuzima	1010601
101060106	Uruhimbi	1010601
101060201	Icyeza	1010602
101060202	Ikana	1010602
101060203	Intwari	1010602
101060204	Kabasengerezi	1010602
101060301	Hirwa	1010603
101060302	Ikaze	1010603
101060303	Imanzi	1010603
101060304	Ingenzi	1010603
101060305	Ituze	1010603
101060306	Sangwa	1010603
101060307	Umwezi	1010603
101060401	Abeza	1010604
101060402	Icyerekezo	1010604
101060403	Indatwa	1010604
101060404	Rwezangoro	1010604
101060405	Ubucuruzi	1010604
101060406	Umutekano	1010604
101060501	Imihigo	1010605
101060502	Impala	1010605
101060503	Rugenge	1010605
101060504	Ubumanzi	1010605
101060601	Indamutsa	1010606
101060602	Ingoro	1010606
101060603	Inkingi	1010606
101060604	Intiganda	1010606
101060605	Iwacu	1010606
101060606	Tetero	1010606
101060701	Bwahirimba	1010607
101060702	Duterimbere	1010607
101060703	Isangano	1010607
101060704	Nyanza	1010607
101060705	Urugwiro	1010607
101060706	Urwego	1010607
101070101	Kabusunzu	1010701
101070102	Munanira	1010701
101070103	Ntaraga	1010701
101070104	Nyagasozi	1010701
101070105	Rurembo	1010701
101070201	Gasiza	1010702
101070202	Kamwiza	1010702
101070203	Kanyange	1010702
101070204	Karudandi	1010702
101070205	Kigabiro	1010702
101070206	Kokobe	1010702
101070207	Mucyuranyana	1010702
101070208	Nkundumurimbo	1010702
101070301	Akinkware	1010703
101070302	Gapfupfu	1010703
101070303	Gasiza	1010703
101070304	Kariyeri	1010703
101070305	Kokobe	1010703
101070306	Munini	1010703
101070307	Nyakabanda	1010703
101070308	Rwagitanga	1010703
101070401	Ibuhoro	1010704
101070402	Kabeza	1010704
101070403	Kanyiranganji	1010704
101070404	Karujongi	1010704
101070405	Kigarama	1010704
101070406	Kirwa	1010704
101080101	Amizero	1010801
101080102	Gabiro	1010801
101080103	Imanzi	1010801
101080104	Ingenzi	1010801
101080105	Intwari	1010801
101080106	Karisimbi	1010801
101080107	Mahoro	1010801
101080108	Mpano	1010801
101080109	Muhabura	1010801
101080110	Muhoza	1010801
101080111	Munini	1010801
101080112	Rugero	1010801
101080113	Shema	1010801
101080201	Kagunga	1010802
101080202	Karukoro	1010802
101080203	Rwintare	1010802
101080301	Akanyana	1010803
101080302	Akanyirazaninka	1010803
101080303	Akarekare	1010803
101080304	Akatabaro	1010803
101080305	Irembo	1010803
101080306	Itaba	1010803
101080307	Kiberinka	1010803
101080308	Mumena	1010803
101080309	Rwampara	1010803
101080401	Gatare	1010804
101080402	Kiberinka	1010804
101080403	Munanira	1010804
101080404	Riba	1010804
101080405	Rubona	1010804
101080406	Rugarama	1010804
101080407	Runyinya	1010804
101080408	Rusisiro	1010804
101080409	Tetero	1010804
101090101	Agatare	1010901
101090102	Amajyambere	1010901
101090103	Inyambo	1010901
101090104	Meraneza	1010901
101090105	Uburezi	1010901
101090106	Umucyo	1010901
101090107	Umurava	1010901
101090201	Biryogo	1010902
101090202	Gabiro	1010902
101090203	Isoko	1010902
101090204	Nyiranuma	1010902
101090205	Umurimo	1010902
101090301	Amizero	1010903
101090302	Cercle Sportif	1010903
101090303	Ganza	1010903
101090304	Imena	1010903
101090305	Indangamirwa	1010903
101090306	Ingenzi	1010903
101090307	Inyarurembo	1010903
101090308	Ishema	1010903
101090309	Isibo	1010903
101090310	Muhabura	1010903
101090311	Rugunga	1010903
101090312	Sugira	1010903
101090401	Amahoro	1010904
101090402	Gacaca	1010904
101090403	Intwari	1010904
101090404	Rwampara	1010904
101090405	Umucyo	1010904
101090406	Umuganda	1010904
101100101	Muhoza	1011001
101100102	Muhuza	1011001
101100103	Mumararungu	1011001
101100104	Murambi	1011001
101100201	Buhoro	1011002
101100202	Gasabo	1011002
101100203	Mutara	1011002
101100204	Ubusabane	1011002
101100301	Abatarushwa	1011003
101100302	Indatwa	1011003
101100303	Inkerakubanza	1011003
101100304	Intwari	1011003
101100401	Amahoro	1011004
101100402	Umucyo	1011004
101100403	Urumuri	1011004
102010101	Akakaza	1020101
102010102	Kigarama	1020101
102010103	Kingabo	1020101
102010104	Muhozi	1020101
102010105	Rubungo	1020101
102010106	Ryakigogo	1020101
102010107	Zindiro	1020101
102010201	Kagarama	1020102
102010202	Kayumba	1020102
102010203	Ramba	1020102
102010204	Rebero	1020102
102010205	Rugando	1020102
102010301	Kigabiro	1020103
102010302	Kiyoro	1020103
102010303	Murarambo	1020103
102010304	Nkona	1020103
102010305	Nyakabingo	1020103
102010306	Rukoma	1020103
102010401	Birembo	1020104
102010402	Gisasa	1020104
102010403	Munini	1020104
102010404	Ruhinga	1020104
102010405	Uwaruraza	1020104
102010501	Akabenejuru	1020105
102010502	Akasedogo	1020105
102010503	Akimpama	1020105
102010504	Burima	1020105
102010505	Kityazo	1020105
102010601	Bushya	1020106
102010602	Gikumba	1020106
102010603	Kamutamu	1020106
102010604	Karama	1020106
102010605	Kayenzi	1020106
102010606	Kigara	1020106
102010607	Kiriza	1020106
102010608	Masizi	1020106
102010609	Mbogo	1020106
102010610	Nyampamo	1020106
102010701	Akanyiramugarura	1020107
102010702	Akigabiro	1020107
102010703	Gishaka	1020107
102010704	Kabuye	1020107
102010705	Mpabwa	1020107
102010706	Nyagasambu	1020107
102010707	Urutarishonga	1020107
102020101	Akamamana	1020201
102020102	Akimihigo	1020201
102020103	Bigega	1020201
102020104	Busasamana	1020201
102020105	Kingasire	1020201
102020106	Kumuyange	1020201
102020107	Muremera	1020201
102020108	Nyagasozi	1020201
102020109	Rugoro	1020201
102020110	Rwesero	1020201
102020111	Tetero	1020201
102020201	Agakomeye	1020202
102020202	Gashubi	1020202
102020203	Gisiza	1020202
102020204	Hanika	1020202
102020205	Juru	1020202
102020206	Kibaya	1020202
102020207	Mpakabavu	1020202
102020208	Musango	1020202
102020209	Ndengo	1020202
102020210	Nyakabande	1020202
102020211	Nyakanunga	1020202
102020212	Rubonobono	1020202
102020213	Runyonza	1020202
102020214	Rusoro	1020202
102020215	Ruvumero	1020202
102020216	Uwagatovu	1020202
102020301	Agataramo	1020203
102020302	Akamwunguzi	1020203
102020303	Akarubimbura	1020203
102020304	Akisoko	1020203
102020305	Amarembo	1020203
102020306	Amizero	1020203
102020307	Bwiza	1020203
102020308	Ihuriro	1020203
102020309	Isangano	1020203
102020310	Kanyonyomba	1020203
102020311	Nyakariba	1020203
102020312	Rwakarihejuru	1020203
102030101	Bwimiyange	1020301
102030102	Bwingeyo	1020301
102030103	Gasagara	1020301
102030104	Rugwiza	1020301
102030201	Ntaganzwa	1020302
102030202	Nyagasozi	1020302
102030203	Nyagisozi	1020302
102030204	Ruganda	1020302
102030301	Gahinga	1020303
102030302	Gasharu	1020303
102030303	Kibobo	1020303
102030304	Nombe	1020303
102030401	Munini	1020304
102030402	Mutokerezwa	1020304
102030403	Rudakabukirwa	1020304
102030404	Runyinya	1020304
102030501	Kimisebeya	1020305
102030502	Kivugiza	1020305
102030503	Rugarama	1020305
102030504	Twina	1020305
102040101	Amajyambere	1020401
102040102	Amarembo	1020401
102040103	Byimana	1020401
102040104	Gasave	1020401
102040105	Gasharu	1020401
102040106	Kagara	1020401
102040107	Nyakariba	1020401
102040108	Rwinyana	1020401
102040201	Kanyinya	1020402
102040202	Kumukenke	1020402
102040203	Murambi	1020402
102040204	Ntora	1020402
102040205	Rukeri	1020402
102040206	Umurava	1020402
102050101	Akamatamu	1020501
102050102	Cyeyere	1020501
102050103	Murehe	1020501
102050104	Nyacyonga	1020501
102050105	Nyagasozi	1020501
102050106	Nyarukurazo	1020501
102050201	Agakenke	1020502
102050202	Agatare	1020502
102050203	Akinyana	1020502
102050204	Gikingo	1020502
102050205	Gitega	1020502
102050206	Gitenga	1020502
102050207	Nyakabingo	1020502
102050208	Nyarurama	1020502
102050209	Rugogwe	1020502
102050210	Taba	1020502
102050301	Amakawa	1020503
102050302	Amasangano	1020503
102050303	Buliza	1020503
102050304	Ihuriro	1020503
102050305	Kabeza	1020503
102050306	Karuruma	1020503
102050307	Murama	1020503
102050308	Nyagasozi	1020503
102050309	Rebero	1020503
102050310	Rugarama	1020503
102050311	Tetero	1020503
102050401	Agasekabuye	1020504
102050402	Agatare	1020504
102050403	Amasangano	1020504
102050404	Mubuga	1020504
102050405	Nyamweru	1020504
102050501	Agahama	1020505
102050502	Agasharu	1020505
102050503	Akabuga	1020505
102050504	Jurwe	1020505
102050505	Kiberinka	1020505
102050506	Nyakirehe	1020505
102050507	Nyarubuye	1020505
102050508	Rubona	1020505
102050509	Rwanyanza	1020505
102050510	Uwanyange	1020505
102060101	Bugarama	1020601
102060102	Bukamba	1020601
102060103	Byimana	1020601
102060104	Kabizoza	1020601
102060105	Kinunga	1020601
102060106	Runyinya	1020601
102060107	Rwankuba	1020601
102060201	Akabande	1020602
102060202	Gatare	1020602
102060203	Nyamugali	1020602
102060204	Nyarubuye	1020602
102060301	Gahinga	1020603
102060302	Gatare	1020603
102060303	Umunyinya	1020603
102060401	Agatwa	1020604
102060402	Kabagina	1020604
102060403	Kajevuba	1020604
102060404	Kigarama	1020604
102060405	Nyagasayo	1020604
102060501	Byimana	1020605
102060502	Kirehe	1020605
102060503	Mataba	1020605
102060504	Nyarurembo	1020605
102060505	Rubona	1020605
102060601	Bwocya	1020606
102060602	Gitaba	1020606
102060603	Karenge	1020606
102060604	Rugina	1020606
102060605	Ruhihi	1020606
102060701	Agasharu	1020607
102060702	Agatare	1020607
102060703	Kabuga	1020607
102060704	Urunyinya	1020607
102070101	Amajyambere	1020701
102070102	Bukinanyana	1020701
102070103	Cyimana	1020701
102070104	Gataba	1020701
102070105	Itetero	1020701
102070106	Kabare	1020701
102070107	Kamuhire	1020701
102070108	Karukamba	1020701
102070109	Nyagacyamo	1020701
102070110	Rwinzovu	1020701
102070111	Urugwiro	1020701
102070112	Uruhongore	1020701
102070201	Agasaro	1020702
102070202	Gasharu	1020702
102070203	Inkingi	1020702
102070204	Kanserege	1020702
102070205	Kigugu	1020702
102070206	Ruganwa	1020702
102070207	Umuco	1020702
102070208	Umutekano	1020702
102070209	Urugero	1020702
102070210	Urwibutso	1020702
102070301	Amahoro	1020703
102070302	Bwiza	1020703
102070303	Ihuriro	1020703
102070304	Ineza	1020703
102070305	Inyange	1020703
102070306	Iriba	1020703
102070307	Kabagari	1020703
102070308	Ubumwe	1020703
102070309	Umutako	1020703
102070310	Urukundo	1020703
102070311	Virunga	1020703
102080101	Inyamibwa	1020801
102080102	Isangano	1020801
102080103	Isano	1020801
102080104	Ituze	1020801
102080105	Izuba	1020801
102080106	Juru	1020801
102080107	Nyenyeri	1020801
102080108	Umurava	1020801
102080109	Urumuri	1020801
102080201	Amahoro	1020802
102080202	Amajyambere	1020802
102080203	Imihigo	1020802
102080204	Intambwe	1020802
102080205	Mutara	1020802
102080206	Rugarama	1020802
102080207	Ubumwe	1020802
102080208	Umutekano	1020802
102080209	Urwego	1020802
102080301	Gasange	1020803
102080302	Gasasa	1020803
102080303	Marembo	1020803
102080304	Rebero	1020803
102080305	Taba	1020803
102090101	Abatuje	1020901
102090102	Amariza	1020901
102090103	Imanzi	1020901
102090104	Imena	1020901
102090105	Imitari	1020901
102090106	Inganji	1020901
102090107	Ingenzi	1020901
102090108	Ingeri	1020901
102090109	Inshuti	1020901
102090110	Intashyo	1020901
102090111	Intwari	1020901
102090112	Inyamibwa	1020901
102090113	Inyange	1020901
102090114	Ubwiza	1020901
102090115	Umwezi	1020901
102090201	Akintwari	1020902
102090202	Buranga	1020902
102090203	Gasharu	1020902
102090204	Ibuhoro	1020902
102090205	Kageyo	1020902
102090206	Kamahinda	1020902
102090207	Karisimbi	1020902
102090208	Karongi	1020902
102090209	Nyirabwana	1020902
102090210	Ramiro	1020902
102090211	Rindiro	1020902
102090212	Rugero	1020902
102090213	Rukurazo	1020902
102090214	Rumuri	1020902
102090301	Bukinanyana	1020903
102090302	Ibuhoro	1020903
102090303	Ijabiro	1020903
102090304	Isangano	1020903
102090305	Itetero	1020903
102090306	Urugwiro	1020903
102100101	Agatare	1021001
102100102	Akanyamugabo	1021001
102100103	Akarambo	1021001
102100104	Akaruvusha	1021001
102100105	Bishikiri	1021001
102100106	Cyeru	1021001
102100107	Gacuriro 2020	1021001
102100108	Kabuhunde Ii	1021001
102100109	Kirira	1021001
102100110	Urubanda	1021001
102100111	Urugarama	1021001
102100201	Agatare	1021002
102100202	Gasharu	1021002
102100203	Kami	1021002
102100204	Rwankuba	1021002
102100301	Dusenyi	1021003
102100302	Gicikiza	1021003
102100303	Giheka	1021003
102100304	Kabuhunde I	1021003
102100305	Kadobogo	1021003
102100306	Kagarama	1021003
102100307	Muhororo	1021003
102100308	Nyakabungo	1021003
102100309	Rukingu	1021003
102100401	Binunga	1021004
102100402	Ngaruyinka	1021004
102100403	Rusenyi	1021004
102100404	Taba	1021004
102110101	Akarwasa	1021101
102110102	Akasemuromba	1021101
102110103	Bucyemba	1021101
102110104	Gasharu	1021101
102110105	Kagarama	1021101
102110106	Ruhangare	1021101
102110201	Ayabakora	1021102
102110202	Cyaruzinge	1021102
102110203	Gashure	1021102
102110204	Gatare	1021102
102110205	Gisura	1021102
102110206	Karubibi	1021102
102110207	Murindi	1021102
102110301	Bahoze	1021103
102110302	Berwa	1021103
102110303	Buhoro	1021103
102110304	Burunga	1021103
102110305	Gitaraga	1021103
102110306	Kira	1021103
102110307	Nezerwa	1021103
102110308	Rugazi	1021103
102110309	Runyonza	1021103
102110310	Tumurere	1021103
102110311	Ururembo	1021103
102110401	Byimana	1021104
102110402	Kabeza	1021104
102110403	Masoro	1021104
102110404	Matwari	1021104
102110405	Mubuga	1021104
102110406	Munini	1021104
102110501	Akamusare	1021105
102110502	Akimana	1021105
102110503	Gasharu	1021105
102110504	Jurwe	1021105
102110505	Karambo	1021105
102110506	Kigabiro	1021105
102110507	Ruseno	1021105
102110601	Kacyinyaga	1021106
102110602	Kamahoro	1021106
102110603	Munini	1021106
102110604	Nyakagezi	1021106
102110605	Ruhangare	1021106
102110606	Ruhogo	1021106
102120101	Kanani	1021201
102120102	Kidahe	1021201
102120103	Kigabiro	1021201
102120104	Nyamurambi	1021201
102120105	Nyarubuye	1021201
102120106	Nyura	1021201
102120201	Gatagara	1021202
102120202	Kagarama	1021202
102120203	Nyabitare	1021202
102120204	Nyakabungo	1021202
102120205	Nyarubande	1021202
102120206	Uruhetse	1021202
102120301	Agacyamo	1021203
102120302	Gashinya	1021203
102120303	Gikombe	1021203
102120304	Kazi	1021203
102120305	Kigufi	1021203
102120306	Nyirakibehe	1021203
102120307	Uruhahiro	1021203
102120401	Agasharu	1021204
102120402	Amataba	1021204
102120403	Burungero	1021204
102120404	Karama	1021204
102120405	Nyange	1021204
102120406	Rebero	1021204
102120407	Uruyange	1021204
102120501	Gatobotobo	1021205
102120502	Kibungo	1021205
102120503	Musezero	1021205
102120504	Nyaburoro	1021205
102120505	Taba	1021205
102120601	Bikumba	1021206
102120602	Gakizi	1021206
102120603	Gatare	1021206
102120604	Kamuyange	1021206
102120605	Kigarama	1021206
102120606	Ngara	1021206
102120701	Akazi	1021207
102120702	Kaduha	1021207
102120703	Kamuhoza	1021207
102120704	Mirambi	1021207
102120705	Munini	1021207
102120706	Ndanyoye	1021207
102120707	Nyamigina	1021207
102120708	Rugarama	1021207
102130101	Amarembo I	1021301
102130102	Amarembo Il	1021301
102130103	Gihogere	1021301
102130104	Kagara	1021301
102130105	Kinunga	1021301
102130106	Nyabisindu	1021301
102130107	Rugarama	1021301
102130201	Gishushu	1021302
102130202	Juru	1021302
102130203	Kamahwa	1021302
102130204	Kangondo I	1021302
102130205	Kangondo Ii	1021302
102130206	Kibiraro I	1021302
102130207	Kibiraro Ii	1021302
102130301	Agashyitsi	1021303
102130302	Amajyambere	1021303
102130303	Izuba	1021303
102130304	Kisimenti	1021303
102130305	Ubumwe	1021303
102130306	Ukwezi	1021303
102130307	Urumuri	1021303
102130401	Amahoro	1021304
102130402	Rebero	1021304
102130403	Ruturusu I	1021304
102130404	Ruturusu Ii	1021304
102130405	Ubumwe	1021304
102140101	Bisenga	1021401
102140102	Gakenyeri	1021401
102140103	Gasiza	1021401
102140104	Kidogo	1021401
102140201	Agatare	1021402
102140202	Gasagara	1021402
102140203	Kamasasa	1021402
102140204	Rugagi	1021402
102140205	Ryabazana	1021402
102140301	Abatangampundu	1021403
102140302	Amahoro	1021403
102140303	Isangano	1021403
102140304	Kabeza	1021403
102140305	Kalisimbi	1021403
102140306	Masango	1021403
102140401	Bwiza	1021404
102140402	Cyanamo	1021404
102140403	Gatare	1021404
102140404	Kamashashi	1021404
102140405	Mataba	1021404
102140406	Nyagakombe	1021404
102140407	Ruhangare	1021404
102140501	Busenyi	1021405
102140502	Kigabiro	1021405
102140503	Kinyana	1021405
102140504	Nyagisozi	1021405
102140601	Cyeru	1021406
102140602	Karambo	1021406
102140603	Kataruha	1021406
102140604	Mugeyo	1021406
102140605	Rugarama	1021406
102140606	Samuduha	1021406
102140701	Gisharara	1021407
102140702	Kabutare	1021407
102140703	Kanyinya	1021407
102140704	Kigarama	1021407
102140705	Nyarucundura	1021407
102140706	Runyonza	1021407
102140707	Urumuri	1021407
102140801	Kinyaga	1021408
102140802	Mirama	1021408
102140803	Nyagacyamo	1021408
102140804	Rugende	1021408
102140805	Ruhanga	1021408
102150101	Gasharu	1021501
102150102	Mulindi	1021501
102150103	Vugavuge	1021501
102150201	Kabarera	1021502
102150202	Kamusengo	1021502
102150203	Karekare	1021502
102150204	Karuranga	1021502
102150205	Nyakabande	1021502
102150301	Kabaliza	1021503
102150302	Nyamise	1021503
102150303	Rwanyanza	1021503
102150401	Cyili	1021504
102150402	Kacyatwa	1021504
102150403	Kandamira	1021504
102150404	Kantabana	1021504
102150405	Munini	1021504
102150501	Abanyangeyo	1021505
102150502	Kibenga	1021505
102150503	Nyamvumvu	1021505
102150601	Kamusare	1021506
102150602	Karwiru	1021506
102150603	Kigabiro	1021506
102150604	Rukerereza	1021506
102150605	Rwintare	1021506
103010101	Gahanga	1030101
103010102	Gatare	1030101
103010103	Gatovu	1030101
103010104	Rinini	1030101
103010105	Rwinanka	1030101
103010106	Ubumwe	1030101
103010201	Kabeza	1030102
103010202	Kabidandi	1030102
103010203	Kiyanja	1030102
103010204	Nyacyonga	1030102
103010205	Nyagafunzo	1030102
103010206	Nyakuguma	1030102
103010207	Rugando Ii	1030102
103010301	Amahoro	1030103
103010302	Bigo	1030103
103010303	Kabeza	1030103
103010304	Kamuyinga	1030103
103010305	Karembure	1030103
103010306	Kimena	1030103
103010307	Mubuga	1030103
103010308	Rwamaya	1030103
103010401	Kampuro	1030104
103010402	Kigasa	1030104
103010403	Mashyiga	1030104
103010404	Nyabigugu	1030104
103010405	Nyamuharaza	1030104
103010406	Rukore	1030104
103010407	Runyoni	1030104
103010408	Sabununga	1030104
103010501	Kigarama	1030105
103010502	Kinyana	1030105
103010503	Mugendo	1030105
103010504	Nunga I	1030105
103010505	Nunga Ii	1030105
103010506	Rugasa	1030105
103010601	Gahosha	1030106
103010602	Gashubi	1030106
103010603	Kaboshya	1030106
103010604	Karambo	1030106
103010605	Rebero	1030106
103010606	Rugando I	1030106
103020101	Amahoro	1030201
103020102	Gakoki	1030201
103020103	Gatenga	1030201
103020104	Ihuriro	1030201
103020105	Isangano	1030201
103020106	Rugari	1030201
103020201	Gwiza	1030202
103020202	Ihuriro	1030202
103020203	Jyambere	1030202
103020204	Kamabuye	1030202
103020205	Mahoro	1030202
103020206	Ramiro	1030202
103020207	Rebero	1030202
103020208	Rugwiro	1030202
103020209	Ruhuka	1030202
103020210	Sangwa	1030202
103020301	Bwiza	1030203
103020302	Cyeza	1030203
103020303	Gasabo	1030203
103020304	Ihuriro	1030203
103020305	Isonga	1030203
103020306	Juru	1030203
103020307	Marembo	1030203
103020308	Murambi	1030203
103020309	Nyanza	1030203
103020310	Rebero	1030203
103020311	Rusororo	1030203
103020312	Sabaganga	1030203
103020313	Taba	1030203
103020401	Bigo	1030204
103020402	Bisambu	1030204
103020403	Kabeza	1030204
103020404	Nyabikenke	1030204
103030101	Gatare	1030301
103030102	Kabuye I	1030301
103030103	Kabuye Ii	1030301
103030104	Kagunga I	1030301
103030105	Kagunga Ii	1030301
103030106	Rebero	1030301
103030201	Kanserege I	1030302
103030202	Kanserege Ii	1030302
103030203	Kanserege Iii	1030302
103030204	Marembo I	1030302
103030205	Marembo Ii	1030302
103030206	Marembo Iii	1030302
103030301	Kigugu I	1030303
103030302	Kigugu Ii	1030303
103030303	Kigugu Iii	1030303
103030304	Kinunga	1030303
103030305	Ruganwa I	1030303
103030306	Ruganwa Ii	1030303
103030307	Ruganwa Iii	1030303
103040101	Bwiza	1030401
103040102	Byimana	1030401
103040103	Ituze	1030401
103040104	Kanserege	1030401
103040105	Kinunga	1030401
103040201	Kamuna	1030402
103040202	Mugeyo	1030402
103040203	Muyange	1030402
103040204	Rugunga	1030402
103040301	Inshuti	1030403
103040302	Mpingayanyanza	1030403
103040303	Nyacyonga	1030403
103040304	Nyanza	1030403
103040305	Rukatsa	1030403
103040306	Taba	1030403
103050101	Amahoro	1030501
103050102	Antene	1030501
103050103	Bamporeze I	1030501
103050104	Bamporeze Ii	1030501
103050105	Gashyushya	1030501
103050106	Gishikiri	1030501
103050107	Hope	1030501
103050108	Kariyeri	1030501
103050109	Nyarugugu	1030501
103050110	Radari	1030501
103050111	Rukore	1030501
103050201	Akagera	1030502
103050202	Bwiza	1030502
103050203	Gasabo	1030502
103050204	Giporoso I	1030502
103050205	Giporoso Ii	1030502
103050206	Juru	1030502
103050207	Kabeza	1030502
103050208	Karisimbi	1030502
103050209	Muhabura	1030502
103050210	Mulindi	1030502
103050211	Nyarurembo	1030502
103050212	Nyenyeri	1030502
103050213	Rebero	1030502
103050301	Bitare	1030503
103050302	Byimana	1030503
103050303	Cyurusagara	1030503
103050304	Gakorokombe	1030503
103050305	Gikundiro	1030503
103050306	Gitarama	1030503
103050307	Karama	1030503
103050308	Nyabyunyu	1030503
103050309	Nyarutovu	1030503
103050310	Urukundo	1030503
103050401	Beninka	1030504
103050402	Bukunzi	1030504
103050403	Cyeru	1030504
103050404	Intwari	1030504
103050405	Itunda	1030504
103050406	Kavumu	1030504
103050407	Susuruka	1030504
103050408	Ubumwe	1030504
103050409	Umunara	1030504
103050410	Uwabarezi	1030504
103050411	Zirakamwa	1030504
103060101	Amajyambere	1030601
103060102	Gasharu	1030601
103060103	Sakirwa	1030601
103060104	Umunyinya	1030601
103060201	Gashiha	1030602
103060202	Iriba	1030602
103060203	Multimedia	1030602
103060204	Umunyinya	1030602
103060205	Umuremure	1030602
103060206	Urugero	1030602
103060301	Gasave	1030603
103060302	Isoko	1030603
103060303	Karisimbi	1030603
103060304	Kicukiro	1030603
103060305	Triangle	1030603
103060306	Ubumwe	1030603
103060401	Ahitegeye	1030604
103060402	Intaho	1030604
103060403	Iriba	1030604
103060404	Isangano	1030604
103060405	Urugero	1030604
103070101	Gakokobe	1030701
103070102	Gatare	1030701
103070103	Imena	1030701
103070104	Ituze	1030701
103070105	Kabutare	1030701
103070106	Kimisange	1030701
103070107	Nyenyeri	1030701
103070108	Ubumenyi	1030701
103070201	Ibuga	1030702
103070202	Ihuriro	1030702
103070203	Murambi	1030702
103070204	Rutoki	1030702
103070205	Taba	1030702
103070206	Terimbere	1030702
103070207	Ubutare	1030702
103070208	Umurimo	1030702
103070301	Akimana	1030703
103070302	Amahoro	1030703
103070303	Byimana	1030703
103070304	Indatwa	1030703
103070305	Ingenzi	1030703
103070306	Kabeza	1030703
103070307	Karurayi	1030703
103070308	Mataba	1030703
103070309	Umucyo	1030703
103070401	Kamabuye	1030704
103070402	Karuyenzi	1030704
103070403	Kivu	1030704
103070404	Rebero	1030704
103070405	Twishorezo	1030704
103070406	Zuba	1030704
103070501	Amajyambere	1030705
103070502	Bwiza	1030705
103070503	Nyarurembo	1030705
103070504	Ubumwe	1030705
103070505	Umutekano	1030705
103070506	Urumuri	1030705
103070507	Uwateke	1030705
103080101	Akababyeyi	1030801
103080102	Ayabaraya	1030801
103080103	Nyamico	1030801
103080104	Nyamyijima	1030801
103080105	Nyirakavomo	1030801
103080106	Rususa	1030801
103080201	Biryogo	1030802
103080202	Bwiza	1030802
103080203	Cyimo	1030802
103080204	Kabeza	1030802
103080205	Kiyovu	1030802
103080206	Masaka	1030802
103080207	Murambi	1030802
103080208	Nyakagunga	1030802
103080209	Urugwiro	1030802
103080301	Bamporeze	1030803
103080302	Butangampundu	1030803
103080303	Butare	1030803
103080304	Cyugamo	1030803
103080305	Gicaca	1030803
103080306	Gihuke	1030803
103080307	Kabeza	1030803
103080308	Kibande	1030803
103080309	Rebero	1030803
103080310	Rugende	1030803
103080311	Ruyaga	1030803
103080401	Gitaraga	1030804
103080402	Kabeza	1030804
103080403	Kajevuba	1030804
103080404	Nyakarambi	1030804
103080405	Nyange	1030804
103080406	Ruhanga	1030804
103080407	Rwintare	1030804
103080501	Kabeza	1030805
103080502	Kamashashi	1030805
103080503	Mbabe	1030805
103080504	Murambi	1030805
103080505	Ngarama	1030805
103080506	Sangano	1030805
103080601	Cyankongi	1030806
103080602	Cyeru	1030806
103080603	Gatare	1030806
103080604	Kagese	1030806
103080605	Kanyetabi	1030806
103080606	Mubano	1030806
103080607	Ruhosha	1030806
103090101	Byimana	1030901
103090102	Gatare	1030901
103090103	Imena	1030901
103090104	Kamahoro	1030901
103090105	Kigarama	1030901
103090106	Rugunga	1030901
103090107	Rurembo	1030901
103090108	Taba	1030901
103090201	Buhoro	1030902
103090202	Gaseke	1030902
103090203	Gateke	1030902
103090204	Gorora	1030902
103090205	Kigabiro	1030902
103090206	Kinunga	1030902
103090207	Kiruhura	1030902
103090208	Munini	1030902
103090209	Murehe	1030902
103090210	Mwijabo	1030902
103090211	Mwijuto	1030902
103090212	Nyarubande	1030902
103090213	Rwezamenyo	1030902
103090214	Sovu	1030902
103090215	Taba	1030902
103090301	Amahoro	1030903
103090302	Amarebe	1030903
103090303	Amarembo	1030903
103090304	Bigabiro	1030903
103090305	Bukinanyana	1030903
103090306	Bumanzi	1030903
103090307	Bwiza	1030903
103090308	Gatsibo	1030903
103090309	Gikundiro	1030903
103090310	Indakemwa	1030903
103090311	Indamutsa	1030903
103090312	Indatwa	1030903
103090313	Inyarurembo	1030903
103090314	Isangano	1030903
103090315	Karama	1030903
103090316	Kinyana	1030903
103090317	Rugwiro	1030903
103090318	Umurava	1030903
103100101	Akindege	1031001
103100102	Indatwa	1031001
103100103	Intwari	1031001
103100104	Kabagendwa	1031001
103100105	Kibaya	1031001
103100106	Mukoni	1031001
103100107	Mulindi	1031001
103100108	Umucyo	1031001
103100109	Uruhongore	1031001
103100201	Gasaraba	1031002
103100202	Gihanga	1031002
103100203	Gitara	1031002
103100204	Kavumu	1031002
103100205	Mahoro	1031002
103100206	Nyarutovu	1031002
103100207	Rugali	1031002
103100208	Runyonza	1031002
103100301	Gabiro	1031003
103100302	Kabaya	1031003
103100303	Kanogo	1031003
103100304	Marembo	1031003
103100305	Mushumbamwiza	1031003
103100306	Nyandungu	1031003
103100307	Ruragendwa	1031003
103100308	Rwinyana	1031003
103100309	Rwinyange	1031003
103100310	Rwiza	1031003
103100311	Urwibutso	1031003
\.


--
-- Name: faults PK_00c45a28afbba70a1aaae9f25cd; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faults
    ADD CONSTRAINT "PK_00c45a28afbba70a1aaae9f25cd" PRIMARY KEY (id);


--
-- Name: cells PK_00d3d50559da6b8b3d56f1b94bd; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cells
    ADD CONSTRAINT "PK_00d3d50559da6b8b3d56f1b94bd" PRIMARY KEY ("cellId");


--
-- Name: districts PK_0e87645c43708ada22bbf9a38e6; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT "PK_0e87645c43708ada22bbf9a38e6" PRIMARY KEY ("districtId");


--
-- Name: audit_logs PK_1bb179d048bbc581caa3b013439; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY (id);


--
-- Name: inspection_faults PK_2832481555cb0b9e5a40882d7e7; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspection_faults
    ADD CONSTRAINT "PK_2832481555cb0b9e5a40882d7e7" PRIMARY KEY (id);


--
-- Name: facilities PK_2e6c685b2e1195e6d6394a22bc7; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facilities
    ADD CONSTRAINT "PK_2e6c685b2e1195e6d6394a22bc7" PRIMARY KEY (id);


--
-- Name: sectors PK_37651404d68e01e75e96dc313fe; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sectors
    ADD CONSTRAINT "PK_37651404d68e01e75e96dc313fe" PRIMARY KEY ("sectorId");


--
-- Name: refresh_tokens PK_7d8bee0204106019488c4c50ffa; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY (id);


--
-- Name: inspection_types PK_7eed0126c53d4739be53027afae; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspection_types
    ADD CONSTRAINT "PK_7eed0126c53d4739be53027afae" PRIMARY KEY (id);


--
-- Name: sms_logs PK_811e3a63f5e14a50475c6e8be3d; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sms_logs
    ADD CONSTRAINT "PK_811e3a63f5e14a50475c6e8be3d" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: inspections PK_a484980015782324454d8c88abe; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspections
    ADD CONSTRAINT "PK_a484980015782324454d8c88abe" PRIMARY KEY (id);


--
-- Name: villages PK_b2228be51f5a8c214b1baba588f; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.villages
    ADD CONSTRAINT "PK_b2228be51f5a8c214b1baba588f" PRIMARY KEY ("villageId");


--
-- Name: inspection_types UQ_4ff1999433f9394bd1401461834; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspection_types
    ADD CONSTRAINT "UQ_4ff1999433f9394bd1401461834" UNIQUE (code);


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: users UQ_fe0bb3f6520ee0469504521e710; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE (username);


--
-- Name: IDX_26ac5d2892b971dd01042a1d37; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_26ac5d2892b971dd01042a1d37" ON public.facilities USING btree (tin);


--
-- Name: IDX_610102b60fea1455310ccd299d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_610102b60fea1455310ccd299d" ON public.refresh_tokens USING btree ("userId");


--
-- Name: idx_cells_sector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cells_sector ON public.cells USING btree ("sectorId");


--
-- Name: idx_sectors_district; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sectors_district ON public.sectors USING btree ("districtId");


--
-- Name: idx_villages_cell; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_villages_cell ON public.villages USING btree ("cellId");


--
-- Name: sms_logs FK_02807fd9a405b20468bdf32ca1b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sms_logs
    ADD CONSTRAINT "FK_02807fd9a405b20468bdf32ca1b" FOREIGN KEY ("inspectionId") REFERENCES public.inspections(id);


--
-- Name: inspections FK_1c6c77dba45411b2431c76f2ece; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspections
    ADD CONSTRAINT "FK_1c6c77dba45411b2431c76f2ece" FOREIGN KEY ("createdById") REFERENCES public.users(id);


--
-- Name: inspections FK_4f36fbe8ecbbd043ba0792dde4f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspections
    ADD CONSTRAINT "FK_4f36fbe8ecbbd043ba0792dde4f" FOREIGN KEY ("facilityId") REFERENCES public.facilities(id);


--
-- Name: refresh_tokens FK_610102b60fea1455310ccd299de; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "FK_610102b60fea1455310ccd299de" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: inspection_faults FK_ae5fb15e78e64cbc9621c085a2c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspection_faults
    ADD CONSTRAINT "FK_ae5fb15e78e64cbc9621c085a2c" FOREIGN KEY ("faultId") REFERENCES public.faults(id);


--
-- Name: inspection_faults FK_bf6d6bb93419a163aa4bd945fff; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspection_faults
    ADD CONSTRAINT "FK_bf6d6bb93419a163aa4bd945fff" FOREIGN KEY ("inspectionId") REFERENCES public.inspections(id) ON DELETE CASCADE;


--
-- Name: facilities FK_c9ce7e8479ec2de9d705d6f511a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facilities
    ADD CONSTRAINT "FK_c9ce7e8479ec2de9d705d6f511a" FOREIGN KEY ("createdById") REFERENCES public.users(id);


--
-- Name: faults FK_e504bce735360878df3aca95f59; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faults
    ADD CONSTRAINT "FK_e504bce735360878df3aca95f59" FOREIGN KEY ("inspectionTypeId") REFERENCES public.inspection_types(id);


--
-- PostgreSQL database dump complete
--

