--
-- PostgreSQL database dump
--

\restrict 7IgXOHnSo2zStWimSpnHXEoTAfXUNRdauOM0wUUR4ISeen0UGAWQDbFg8G4lX9m

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: announcements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.announcements (
    id bigint NOT NULL,
    course_id bigint NOT NULL,
    user_id bigint NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.announcements OWNER TO postgres;

--
-- Name: announcements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.announcements_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.announcements_id_seq OWNER TO postgres;

--
-- Name: announcements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.announcements_id_seq OWNED BY public.announcements.id;


--
-- Name: assessments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assessments (
    id bigint NOT NULL,
    course_id bigint NOT NULL,
    lesson_id bigint,
    title character varying(255) NOT NULL,
    description text,
    type character varying(255) NOT NULL,
    topic character varying(255),
    total_points numeric(8,2) DEFAULT '100'::numeric NOT NULL,
    time_limit_minutes integer,
    max_attempts integer DEFAULT 1 NOT NULL,
    available_from timestamp(0) without time zone,
    due_date timestamp(0) without time zone,
    is_published boolean DEFAULT false NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT assessments_type_check CHECK (((type)::text = ANY ((ARRAY['quiz'::character varying, 'long_exam'::character varying, 'individual_activity'::character varying, 'group_activity'::character varying, 'recitation'::character varying])::text[])))
);


ALTER TABLE public.assessments OWNER TO postgres;

--
-- Name: assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.assessments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.assessments_id_seq OWNER TO postgres;

--
-- Name: assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.assessments_id_seq OWNED BY public.assessments.id;


--
-- Name: cache; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cache (
    key character varying(255) NOT NULL,
    value text NOT NULL,
    expiration bigint NOT NULL
);


ALTER TABLE public.cache OWNER TO postgres;

--
-- Name: cache_locks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cache_locks (
    key character varying(255) NOT NULL,
    owner character varying(255) NOT NULL,
    expiration bigint NOT NULL
);


ALTER TABLE public.cache_locks OWNER TO postgres;

--
-- Name: calendar_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.calendar_events (
    id bigint NOT NULL,
    course_id bigint NOT NULL,
    user_id bigint NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    event_type character varying(255) DEFAULT 'other'::character varying NOT NULL,
    color character varying(7) DEFAULT '#3B82F6'::character varying NOT NULL,
    start_date timestamp(0) without time zone NOT NULL,
    end_date timestamp(0) without time zone,
    all_day boolean DEFAULT false NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT calendar_events_event_type_check CHECK (((event_type)::text = ANY ((ARRAY['lesson'::character varying, 'quiz'::character varying, 'exam'::character varying, 'activity'::character varying, 'deadline'::character varying, 'other'::character varying])::text[])))
);


ALTER TABLE public.calendar_events OWNER TO postgres;

--
-- Name: calendar_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.calendar_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.calendar_events_id_seq OWNER TO postgres;

--
-- Name: calendar_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.calendar_events_id_seq OWNED BY public.calendar_events.id;


--
-- Name: courses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.courses (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(255) NOT NULL,
    description text,
    instructor_id bigint NOT NULL,
    semester character varying(255) NOT NULL,
    section character varying(255),
    status character varying(255) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    join_code character varying(10),
    CONSTRAINT courses_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'archived'::character varying])::text[])))
);


ALTER TABLE public.courses OWNER TO postgres;

--
-- Name: courses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.courses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.courses_id_seq OWNER TO postgres;

--
-- Name: courses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.courses_id_seq OWNED BY public.courses.id;


--
-- Name: enrollments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.enrollments (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    course_id bigint NOT NULL,
    status character varying(255) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT enrollments_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'dropped'::character varying, 'completed'::character varying])::text[])))
);


ALTER TABLE public.enrollments OWNER TO postgres;

--
-- Name: enrollments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.enrollments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.enrollments_id_seq OWNER TO postgres;

--
-- Name: enrollments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.enrollments_id_seq OWNED BY public.enrollments.id;


--
-- Name: failed_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.failed_jobs (
    id bigint NOT NULL,
    uuid character varying(255) NOT NULL,
    connection text NOT NULL,
    queue text NOT NULL,
    payload text NOT NULL,
    exception text NOT NULL,
    failed_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.failed_jobs OWNER TO postgres;

--
-- Name: failed_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.failed_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.failed_jobs_id_seq OWNER TO postgres;

--
-- Name: failed_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.failed_jobs_id_seq OWNED BY public.failed_jobs.id;


--
-- Name: grades; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grades (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    course_id bigint NOT NULL,
    quiz_average numeric(5,2),
    exam_average numeric(5,2),
    activity_average numeric(5,2),
    recitation_average numeric(5,2),
    overall_grade numeric(5,2),
    remarks character varying(255),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.grades OWNER TO postgres;

--
-- Name: grades_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.grades_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.grades_id_seq OWNER TO postgres;

--
-- Name: grades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.grades_id_seq OWNED BY public.grades.id;


--
-- Name: job_batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_batches (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    total_jobs integer NOT NULL,
    pending_jobs integer NOT NULL,
    failed_jobs integer NOT NULL,
    failed_job_ids text NOT NULL,
    options text,
    cancelled_at integer,
    created_at integer NOT NULL,
    finished_at integer
);


ALTER TABLE public.job_batches OWNER TO postgres;

--
-- Name: jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jobs (
    id bigint NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    attempts smallint NOT NULL,
    reserved_at integer,
    available_at integer NOT NULL,
    created_at integer NOT NULL
);


ALTER TABLE public.jobs OWNER TO postgres;

--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.jobs_id_seq OWNER TO postgres;

--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- Name: lesson_materials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lesson_materials (
    id bigint NOT NULL,
    lesson_id bigint NOT NULL,
    title character varying(255) NOT NULL,
    type character varying(255) DEFAULT 'pdf'::character varying NOT NULL,
    file_path character varying(255),
    url character varying(255),
    "order" integer DEFAULT 0 NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    extracted_text text,
    CONSTRAINT lesson_materials_type_check CHECK (((type)::text = ANY ((ARRAY['pdf'::character varying, 'video'::character varying, 'ppt'::character varying, 'link'::character varying, 'other'::character varying])::text[])))
);


ALTER TABLE public.lesson_materials OWNER TO postgres;

--
-- Name: lesson_materials_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lesson_materials_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lesson_materials_id_seq OWNER TO postgres;

--
-- Name: lesson_materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lesson_materials_id_seq OWNED BY public.lesson_materials.id;


--
-- Name: lesson_progress; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lesson_progress (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    lesson_id bigint NOT NULL,
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    time_spent_seconds integer DEFAULT 0 NOT NULL,
    started_at timestamp(0) without time zone,
    completed_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT lesson_progress_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'in_progress'::character varying, 'done'::character varying, 'missing'::character varying])::text[])))
);


ALTER TABLE public.lesson_progress OWNER TO postgres;

--
-- Name: lesson_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lesson_progress_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lesson_progress_id_seq OWNER TO postgres;

--
-- Name: lesson_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lesson_progress_id_seq OWNED BY public.lesson_progress.id;


--
-- Name: lessons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lessons (
    id bigint NOT NULL,
    course_id bigint NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    topic character varying(255),
    "order" integer DEFAULT 0 NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    available_from timestamp(0) without time zone,
    available_until timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.lessons OWNER TO postgres;

--
-- Name: lessons_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lessons_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lessons_id_seq OWNER TO postgres;

--
-- Name: lessons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lessons_id_seq OWNED BY public.lessons.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    migration character varying(255) NOT NULL,
    batch integer NOT NULL
);


ALTER TABLE public.migrations OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.migrations_id_seq OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_tokens (
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    created_at timestamp(0) without time zone
);


ALTER TABLE public.password_reset_tokens OWNER TO postgres;

--
-- Name: personal_access_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.personal_access_tokens (
    id bigint NOT NULL,
    tokenable_type character varying(255) NOT NULL,
    tokenable_id bigint NOT NULL,
    name text NOT NULL,
    token character varying(64) NOT NULL,
    abilities text,
    last_used_at timestamp(0) without time zone,
    expires_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.personal_access_tokens OWNER TO postgres;

--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.personal_access_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.personal_access_tokens_id_seq OWNER TO postgres;

--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.personal_access_tokens_id_seq OWNED BY public.personal_access_tokens.id;


--
-- Name: questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.questions (
    id bigint NOT NULL,
    assessment_id bigint NOT NULL,
    question_text text NOT NULL,
    type character varying(255) NOT NULL,
    options json,
    correct_answer text,
    points numeric(8,2) DEFAULT '1'::numeric NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT questions_type_check CHECK (((type)::text = ANY ((ARRAY['multiple_choice'::character varying, 'true_false'::character varying, 'short_answer'::character varying, 'essay'::character varying])::text[])))
);


ALTER TABLE public.questions OWNER TO postgres;

--
-- Name: questions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.questions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.questions_id_seq OWNER TO postgres;

--
-- Name: questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.questions_id_seq OWNED BY public.questions.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    id character varying(255) NOT NULL,
    user_id bigint,
    ip_address character varying(45),
    user_agent text,
    payload text NOT NULL,
    last_activity integer NOT NULL
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: submission_answers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.submission_answers (
    id bigint NOT NULL,
    submission_id bigint NOT NULL,
    question_id bigint NOT NULL,
    answer_text text,
    is_correct boolean,
    points_earned numeric(8,2),
    ai_feedback text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.submission_answers OWNER TO postgres;

--
-- Name: submission_answers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.submission_answers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.submission_answers_id_seq OWNER TO postgres;

--
-- Name: submission_answers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.submission_answers_id_seq OWNED BY public.submission_answers.id;


--
-- Name: submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.submissions (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    assessment_id bigint NOT NULL,
    attempt_number integer DEFAULT 1 NOT NULL,
    score numeric(8,2),
    total_points numeric(8,2),
    percentage numeric(5,2),
    status character varying(255) DEFAULT 'in_progress'::character varying NOT NULL,
    ai_feedback text,
    started_at timestamp(0) without time zone,
    submitted_at timestamp(0) without time zone,
    graded_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT submissions_status_check CHECK (((status)::text = ANY ((ARRAY['in_progress'::character varying, 'submitted'::character varying, 'graded'::character varying])::text[])))
);


ALTER TABLE public.submissions OWNER TO postgres;

--
-- Name: submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.submissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.submissions_id_seq OWNER TO postgres;

--
-- Name: submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.submissions_id_seq OWNED BY public.submissions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    email_verified_at timestamp(0) without time zone,
    password character varying(255) NOT NULL,
    role character varying(255) DEFAULT 'student'::character varying NOT NULL,
    google_id character varying(255),
    avatar character varying(255),
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp(0) without time zone,
    remember_token character varying(100),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['student'::character varying, 'instructor'::character varying, 'admin'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: announcements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements ALTER COLUMN id SET DEFAULT nextval('public.announcements_id_seq'::regclass);


--
-- Name: assessments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessments ALTER COLUMN id SET DEFAULT nextval('public.assessments_id_seq'::regclass);


--
-- Name: calendar_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_events ALTER COLUMN id SET DEFAULT nextval('public.calendar_events_id_seq'::regclass);


--
-- Name: courses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses ALTER COLUMN id SET DEFAULT nextval('public.courses_id_seq'::regclass);


--
-- Name: enrollments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollments ALTER COLUMN id SET DEFAULT nextval('public.enrollments_id_seq'::regclass);


--
-- Name: failed_jobs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.failed_jobs ALTER COLUMN id SET DEFAULT nextval('public.failed_jobs_id_seq'::regclass);


--
-- Name: grades id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grades ALTER COLUMN id SET DEFAULT nextval('public.grades_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- Name: lesson_materials id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_materials ALTER COLUMN id SET DEFAULT nextval('public.lesson_materials_id_seq'::regclass);


--
-- Name: lesson_progress id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_progress ALTER COLUMN id SET DEFAULT nextval('public.lesson_progress_id_seq'::regclass);


--
-- Name: lessons id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons ALTER COLUMN id SET DEFAULT nextval('public.lessons_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: personal_access_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personal_access_tokens ALTER COLUMN id SET DEFAULT nextval('public.personal_access_tokens_id_seq'::regclass);


--
-- Name: questions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions ALTER COLUMN id SET DEFAULT nextval('public.questions_id_seq'::regclass);


--
-- Name: submission_answers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submission_answers ALTER COLUMN id SET DEFAULT nextval('public.submission_answers_id_seq'::regclass);


--
-- Name: submissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submissions ALTER COLUMN id SET DEFAULT nextval('public.submissions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.announcements (id, course_id, user_id, title, content, is_pinned, created_at, updated_at) FROM stdin;
1	1	2	Welcome to WEB101!	Hello everyone! Please review the course syllabus before our first meeting.	t	2026-03-27 02:35:59	2026-03-27 02:35:59
2	1	2	Quiz 1 Schedule	Quiz 1 covering HTML basics will be held next week. Good luck!	f	2026-03-27 02:35:59	2026-03-27 02:35:59
\.


--
-- Data for Name: assessments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.assessments (id, course_id, lesson_id, title, description, type, topic, total_points, time_limit_minutes, max_attempts, available_from, due_date, is_published, created_at, updated_at) FROM stdin;
1	1	1	Quiz 1: HTML Basics	Test your knowledge of HTML fundamentals.	quiz	HTML	30.00	30	2	2026-03-22 02:35:59	2026-03-29 02:35:59	t	2026-03-27 02:35:59	2026-03-27 02:35:59
2	1	2	Quiz 2: CSS Fundamentals	Test your understanding of CSS styling and the box model.	quiz	CSS	40.00	20	1	2026-03-26 02:35:59	2026-04-03 02:35:59	t	2026-03-27 02:35:59	2026-03-27 02:35:59
3	1	\N	Test quiz	\N	quiz	\N	100.00	10	1	\N	\N	f	2026-04-23 03:53:21	2026-04-23 03:53:21
6	1	\N	HTML BASICS	\N	quiz	\N	100.00	\N	1	\N	\N	t	2026-05-03 22:46:35	2026-05-03 22:46:35
7	1	\N	FASFAADADAS	\N	quiz	\N	100.00	\N	1	\N	\N	t	2026-05-04 03:30:13	2026-05-04 03:30:13
\.


--
-- Data for Name: cache; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cache (key, value, expiration) FROM stdin;
\.


--
-- Data for Name: cache_locks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cache_locks (key, owner, expiration) FROM stdin;
\.


--
-- Data for Name: calendar_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.calendar_events (id, course_id, user_id, title, description, event_type, color, start_date, end_date, all_day, created_at, updated_at) FROM stdin;
1	1	2	Quiz 1: HTML Basics	\N	quiz	#F59E0B	2026-03-29 02:35:59	\N	t	2026-03-27 02:35:59	2026-03-27 02:35:59
2	1	2	Midterm Exam	\N	exam	#EF4444	2026-04-10 02:35:59	\N	t	2026-03-27 02:35:59	2026-03-27 02:35:59
\.


--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.courses (id, name, code, description, instructor_id, semester, section, status, created_at, updated_at, join_code) FROM stdin;
1	Introduction to Web Development	WEB101	Covers the fundamentals of HTML, CSS, JavaScript, and backend development.	2	1st Semester 2026	A	active	2026-03-27 02:35:59	2026-05-03 14:48:50	\N
\.


--
-- Data for Name: enrollments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.enrollments (id, user_id, course_id, status, created_at, updated_at) FROM stdin;
1	3	1	active	2026-03-27 02:35:59	2026-03-27 02:35:59
2	4	1	active	2026-03-27 02:35:59	2026-03-27 02:35:59
3	5	1	active	2026-03-27 02:35:59	2026-03-27 02:35:59
4	6	1	active	2026-03-27 02:35:59	2026-03-27 02:35:59
7	14	1	active	2026-05-03 14:48:33	2026-05-03 14:48:33
\.


--
-- Data for Name: failed_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.failed_jobs (id, uuid, connection, queue, payload, exception, failed_at) FROM stdin;
\.


--
-- Data for Name: grades; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.grades (id, user_id, course_id, quiz_average, exam_average, activity_average, recitation_average, overall_grade, remarks, created_at, updated_at) FROM stdin;
1	3	1	89.00	75.00	91.00	75.00	76.00	Passed	2026-03-27 02:35:59	2026-03-27 02:35:59
2	4	1	92.00	75.00	96.00	85.00	92.00	Passed	2026-03-27 02:35:59	2026-03-27 02:35:59
3	5	1	74.00	75.00	76.00	78.00	73.00	Passed	2026-03-27 02:35:59	2026-03-27 02:35:59
4	6	1	78.00	74.00	77.00	95.00	73.00	Passed	2026-03-27 02:35:59	2026-03-27 02:35:59
\.


--
-- Data for Name: job_batches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.job_batches (id, name, total_jobs, pending_jobs, failed_jobs, failed_job_ids, options, cancelled_at, created_at, finished_at) FROM stdin;
\.


--
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.jobs (id, queue, payload, attempts, reserved_at, available_at, created_at) FROM stdin;
\.


--
-- Data for Name: lesson_materials; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lesson_materials (id, lesson_id, title, type, file_path, url, "order", created_at, updated_at, extracted_text) FROM stdin;
1	1	HTML Cheat Sheet	pdf	\N	https://htmlcheatsheet.com	1	2026-03-27 02:35:59	2026-03-27 02:35:59	\N
2	2	CSS Flexbox Guide	link	\N	https://css-tricks.com/snippets/css/a-guide-to-flexbox	1	2026-03-27 02:35:59	2026-03-27 02:35:59	\N
8	4	basics of html	pdf	materials/course_1/lesson_4/OiVpk0NAtAGVqcx0vtrBizK7jWZIvEGeus5a1gX8.pdf	\N	0	2026-04-25 22:07:01	2026-04-25 22:07:01	HTML uses basic tags to structure a webpage, such as <!DOCTYPE html> to \ndeclare the document type, <html> as the root element, <head> for \nmetadata, and <body> for the visible content. Inside the body, common tags \ninclude headings like <h1> to <h6>, paragraphs using <p>, links with <a \nhref="">, images with <img src="" alt="">, lists using <ul>, <ol>, and \n<li>, and containers like <div> and <span> for grouping content. Forms use \ntags such as <form>, <input>, <label>, <textarea>, and <button>, while \ntables use <table>, <tr>, <th>, and <td>. Attributes like class, id, src, \nand href provide additional information and control styling or behavior. \nHTML syntax is based on opening and closing tags, for example <p>This is a \nparagraph.</p>, although some tags like <img> and <br> do not require a \nclosing tag.
11	6	TEST 1	pdf	materials/course_1/lesson_6/x4bJRusl8PI9qgrylq5Wm1RvzESrpnVkqMIRhYCW.pdf	\N	0	2026-05-03 23:09:33	2026-05-03 23:09:33	LESSON 1  \n  Introduction to ASP.NET \n \n \n \n \n \n \n \n \n \n \n \n \n \n \n \n \n \n \n \n Microsoft released ASP.NET to the world as part of the 1.0 release of the .NET framework \nin January 2002. XML was king, and the future was based around XML web services. It was then \nthat the first version of ASP.NET was released in early 2002 as part of version 1.0 of the .NET \nFramework. It was initially designed to provide a better web platform than classic ASP and \nActiveX, one that would feel familiar to existing Windows developers. \n \n By 2008, changes in the web were happening fast and ASP.NET was somewhat ill-\nprepared for them. While ASP.NET worked well in the old 2002 world of server-centric web \napplications and XML-based web services, advances in web development meant the abstraction \nbecame even leakier. \n \n Microsoft was aware of the situation that they start announcing in late 2007 that they were \nworking on a new framework called ASP.NET MVC where they were trying to address these \nconcerns. The framework would be open sourced and explicitly designed with testability and \npluggability in mind. Here are the key design goals of Microsoft when they start creating MVC: \n \n✓ Follows the separation of concerns design principle \n✓ Grants full control over the generated HTML \n✓ Provides first-class support for TDD (test-driven development) \n✓ Integrates with existing ASP.NET infrastructure (Caching, Session, Modules, Handlers, \nIIS hosting, etc.) \n   TOPICS \n1.Brief History of ASP.Net \n2.ASP.NET Web Form Model  \n3.ASP.NET Life Cycle \n4.ASP.NET – Event Handling \n5.ASP.NET – Web Forms Features \n \n   LEARNING OUTCOMES \n    \nAt the end of the lesson, the students are expected to: \n    \n1.explain the features of ASP.NET \n2.recall the features of ASP .NET  \n3.understand Frameworks under ASP .NET \n \nTOPIC 1 Brief History of ASP.NET\n\n✓ Pluggable. Appropriate hooks to be provided so components like the controller factory or \nthe view engine can be replaced \n✓ Uses the ASPX view engine (without View State or postbacks) by default, but allows other \nview engines to be used as the one from MonoRail, etc. \n✓ Supports IoC (inversion of control) containers for controller creation and dependency \ninjection on the controllers \n✓ Provides complete control over URLs and navigation \n \n During the release of MVC, Microsoft had to face tough challenges. While having a \nsignificant investment and user base with Web Forms, at the same time, it had to shift towards \nMVC as its future strategy. The position adopted since MVC 1.0 was that both frameworks were \ncompatible and had different strengths. WebForms was positioned as a RAD platform due to its \nset of controls and stateful nature, allowing developers to quickly build applications without \ndealing with the complexities of the web. \n \n The development cycle of MVC continued to be independent of the .NET framework, with \nMVC 3 released in early 2011. This was a major milestone for MVC that improved the scaffolding \nfeatures and introduced the Razor view engine, finally replacing the old ASPX view engine. \nAnother highlight was the release of NuGet which finally brought a package manager to the .NET \ncommunity, similar to the existing RubyGems or NPM which made the Ruby and Node.js open-\nsource ecosystems thrive. Releasing and using open-source libraries for .NET had never been \neasier! NuGet also changed the scenario. NuGet was the perfect match for MVC and its pluggable \nnature. \n \n ASP.NET reached 2014 in good shape, with several libraries offered under the One \nASP.NET umbrella to suit different web application needs. You might not have been the only one \nwho thought the framework had reached its full potential and would remain stable for several \nyears. \n \nASP.NET is a web development platform, which provides a programming model, a \ncomprehensive software infrastructure, and various services required to build up robust web \napplications for PC, as well as mobile devices. \nASP.NET works on top of the HTTP protocol and uses the HTTP commands and policies \nto set a browser-to-server bilateral communication and cooperation. \nASP.NET is a part of the Microsoft .Net platform. ASP.NET applications are compiled \ncodes, written using the extensible and reusable components or objects present in the .Net \nframework. These codes can use the entire hierarchy of classes in the .Net framework. \nThe ASP.NET application codes can be written in any of the following languages: \n• C# \n• Visual Basic.Net \nTOPIC 2 ASP.NET Web Form Model\n\n• Jscript \n• J# \nASP.NET is used to produce interactive, data-driven web applications over the internet. It \nconsists of a large number of controls such as text boxes, buttons, and labels for assembling, \nconfiguring, and manipulating code to create HTML pages. \nASP.NET web forms extend the event-driven model of interaction to web applications. \nThe browser submits a web form to the web server and the server returns a full markup page or \nHTML page in response. \nAll client-side user activities are forwarded to the server for stateful processing. The server \nprocesses the output of the client actions and triggers the reactions. \nNow, HTTP is a stateless protocol. ASP.NET framework helps in storing the information \nregarding the state of the application, which consists of: \n• Page state \n• Session state \nThe page state is the state of the client, i.e., the content of various input fields in the web form. \nThe session state is the collective information obtained from various pages the user visited and \nworked with, i.e., the overall session state. To clear the concept, let us take an example of a \nshopping cart. \nUser adds items to a shopping cart. Items are selected from a page, say the items page, and the \ntotal collected items and price are shown on a different page, say the cart page. Only HTTP cannot \nkeep track of all the information coming from various pages. ASP.NET session state and server-\nside infrastructure keep track of the information collected globally over a session. \nThe ASP.NET runtime carries the page state to and from the server across page requests while \ngenerating ASP.NET runtime codes, and incorporates the state of the server-side components in \nhidden fields. \nThis way, the server becomes aware of the overall application state and operates in a two-tiered \nconnected way. \nTHE ASP.NET COMPONENT MODEL \nThe ASP.NET component model provides various building blocks of ASP.NET pages. Basically, \nit is an object model, which describes: \n• Server-side counterparts of almost all HTML elements or tags, such as <form> and \n<input>. \n• Server controls, which help in developing complex user-interface. For example, the \nCalendar control or the Gridview control. \nASP.NET is a technology, which works on the .Net framework that contains all web-related \nfunctionalities. The .Net framework is made of an object-oriented hierarchy. An ASP.NET web \napplication is made of pages. When a user requests an ASP.NET page, the IIS delegates the \nprocessing of the page to the ASP.NET runtime system.\n\nThe ASP.NET runtime transforms the .aspx page into an instance of a class, which inherits \nfrom the base class page of the .Net framework. Therefore, each ASP.NET page is an object, and \nall its components i.e., the server-side controls are also objects. \nCOMPONENTS OF .NET FRAMEWORK 4.7 \nBefore going to the next session on Visual Studio.Net, let us go through the various \ncomponents of the .Net framework 4.7. The following table describes the components of the .Net \nframework 4.7 and the job they perform: \nCOMPONENTS AND THEIR DESCRIPTION \n1. Common Language Runtime or CLR \nIt performs memory management, exception handling, debugging, security checking, thread \nexecution, code execution, code safety, verification, and compilation. The code that is directly \nmanaged by the CLR is called the managed code. When the managed code is compiled, the \ncompiler converts the source code into a CPU-independ
\.


--
-- Data for Name: lesson_progress; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lesson_progress (id, user_id, lesson_id, status, time_spent_seconds, started_at, completed_at, created_at, updated_at) FROM stdin;
1	3	1	done	1194	2026-03-22 02:35:59	2026-03-23 02:35:59	2026-03-27 02:35:59	2026-03-27 02:35:59
3	4	1	done	1142	2026-03-22 02:35:59	2026-03-23 02:35:59	2026-03-27 02:35:59	2026-03-27 02:35:59
4	4	2	in_progress	497	2026-03-25 02:35:59	\N	2026-03-27 02:35:59	2026-03-27 02:35:59
5	5	1	done	1499	2026-03-22 02:35:59	2026-03-23 02:35:59	2026-03-27 02:35:59	2026-03-27 02:35:59
6	5	2	in_progress	541	2026-03-25 02:35:59	\N	2026-03-27 02:35:59	2026-03-27 02:35:59
7	6	1	done	1177	2026-03-22 02:35:59	2026-03-23 02:35:59	2026-03-27 02:35:59	2026-03-27 02:35:59
8	6	2	in_progress	227	2026-03-25 02:35:59	\N	2026-03-27 02:35:59	2026-03-27 02:35:59
9	3	4	in_progress	0	2026-04-22 11:18:40	\N	2026-04-22 11:18:40	2026-04-22 11:18:40
10	3	3	in_progress	0	2026-04-23 03:24:41	\N	2026-04-23 03:24:41	2026-04-23 03:24:41
2	3	2	done	273	2026-03-25 02:35:59	2026-04-26 10:43:35	2026-03-27 02:35:59	2026-04-26 10:43:35
12	3	6	in_progress	0	2026-05-03 14:57:41	\N	2026-05-03 14:57:41	2026-05-03 14:57:41
\.


--
-- Data for Name: lessons; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lessons (id, course_id, title, description, topic, "order", is_published, available_from, available_until, created_at, updated_at) FROM stdin;
1	1	HTML Fundamentals	Learn the core concepts of HTML.	HTML	1	t	2026-03-20 02:35:59	\N	2026-03-27 02:35:59	2026-03-27 02:35:59
2	1	CSS Styling Basics	Learn the core concepts of CSS.	CSS	2	t	2026-03-20 02:35:59	\N	2026-03-27 02:35:59	2026-03-27 02:35:59
3	1	JavaScript Intro	Learn the core concepts of JavaScript.	JavaScript	3	t	2026-03-20 02:35:59	\N	2026-03-27 02:35:59	2026-03-27 02:35:59
4	1	TEST 1	\N	\N	3	t	\N	\N	2026-04-22 11:08:43	2026-04-22 11:08:43
6	1	TEST 2	\N	\N	4	t	\N	\N	2026-05-03 14:56:45	2026-05-03 14:56:45
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.migrations (id, migration, batch) FROM stdin;
1	0001_01_01_000000_create_users_table	1
2	0001_01_01_000001_create_cache_table	1
3	0001_01_01_000002_create_jobs_table	1
4	2026_03_25_222538_create_personal_access_tokens_table	1
5	2026_03_26_000001_create_courses_table	1
6	2026_03_26_000002_create_enrollments_table	1
7	2026_03_26_000003_create_lessons_table	1
8	2026_03_26_000004_create_lesson_progress_table	1
9	2026_03_26_000005_create_assessments_table	1
10	2026_03_26_000006_create_supporting_tables	1
11	2026_04_22_000001_add_join_code_to_courses_table	2
12	2026_04_26_000001_add_extracted_text_to_lesson_materials	3
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_reset_tokens (email, token, created_at) FROM stdin;
\.


--
-- Data for Name: personal_access_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.personal_access_tokens (id, tokenable_type, tokenable_id, name, token, abilities, last_used_at, expires_at, created_at, updated_at) FROM stdin;
32	App\\Models\\User	3	auth-token	f0bc661f036026ba91828cc526f63f7a33662e9ab6f774afc3be795c315dcf21	["*"]	2026-04-26 11:53:44	\N	2026-04-26 11:53:39	2026-04-26 11:53:44
8	App\\Models\\User	3	auth-token	d65c9e7b536590a10f77f6523303c4c6e804971c86cd81456c740c4a188825d8	["*"]	\N	\N	2026-04-22 08:20:06	2026-04-22 08:20:06
9	App\\Models\\User	3	auth-token	0515a646df9fe7c9a52dedefabfaf16016cd8b7dd57948d63877568af96871b7	["*"]	2026-04-22 08:20:41	\N	2026-04-22 08:20:30	2026-04-22 08:20:41
35	App\\Models\\User	9	auth-token	59f7227095cfedca03e53938e07abdd0c6168b47cb70b8f9f3350dac42691aa4	["*"]	2026-04-26 13:28:12	\N	2026-04-26 13:22:23	2026-04-26 13:28:12
30	App\\Models\\User	2	auth-token	a298fff516de0496387431863c8188c4a42c54f6ae5eb09aedf64d8962197f32	["*"]	2026-04-26 11:54:21	\N	2026-04-26 11:35:05	2026-04-26 11:54:21
43	App\\Models\\User	3	auth-token	512c0337e6b87279377901d6338847aca80c94e636584aaac4c30e5fe4bc8d34	["*"]	2026-04-28 13:14:11	\N	2026-04-28 13:12:56	2026-04-28 13:14:11
24	App\\Models\\User	3	auth-token	7918297f4b900d3dcde9a7c40561c182adf3a1affe15f80ec16f661994b49dda	["*"]	2026-04-25 21:17:02	\N	2026-04-25 21:14:21	2026-04-25 21:17:02
53	App\\Models\\User	3	auth-token	672b39cf70a3e70b72f3ef6b36334ae0d8f98556aa9c50c39489a2a791bcc639	["*"]	2026-05-03 15:47:54	\N	2026-05-03 15:47:50	2026-05-03 15:47:54
33	App\\Models\\User	8	auth-token	5fe2ea885685dd2c1d95bc77c8671c51bd029f5bb341c252cfb7685a1a6a5404	["*"]	2026-04-26 12:17:09	\N	2026-04-26 12:15:15	2026-04-26 12:17:09
22	App\\Models\\User	3	auth-token	b2ed8373457099a4d0d20e84d03628901a0c5c791f88feabc555a6086d92418b	["*"]	2026-04-25 21:08:15	\N	2026-04-25 21:07:24	2026-04-25 21:08:15
42	App\\Models\\User	2	auth-token	c19c27f1e6f533f54500bf48162fd311947605934f1ed7470ea4fd7e7acc0a2b	["*"]	2026-04-27 12:28:49	\N	2026-04-27 10:30:43	2026-04-27 12:28:49
34	App\\Models\\User	9	auth-token	5394a5616722f7f316e7bc339ce383d22885b821996c969f4c0731fb316d8f92	["*"]	\N	\N	2026-04-26 13:21:10	2026-04-26 13:21:10
61	App\\Models\\User	3	auth-token	3cbf4895c2aaa0acddbf164140da2ad7510bd9ebeb3c6f0f9169782f1bdc3f5a	["*"]	2026-05-03 23:54:17	\N	2026-05-03 22:23:05	2026-05-03 23:54:17
59	App\\Models\\User	2	auth-token	736859983c04e401ab6b615a8e886727aae45c5ec530b3ecece084863c88c85b	["*"]	2026-05-03 23:54:18	\N	2026-05-03 22:21:26	2026-05-03 23:54:18
\.


--
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.questions (id, assessment_id, question_text, type, options, correct_answer, points, "order", created_at, updated_at) FROM stdin;
1	1	What does HTML stand for?	multiple_choice	["Hyper Text Markup Language","High Tech Modern Language","Hyper Transfer Markup Language","Home Tool Markup Language"]	Hyper Text Markup Language	10.00	1	2026-03-27 02:35:59	2026-03-27 02:35:59
2	1	Which tag is used to create a hyperlink?	multiple_choice	["<link>","<a>","<href>","<url>"]	<a>	10.00	2	2026-03-27 02:35:59	2026-03-27 02:35:59
3	1	The <head> tag contains content visible to the user.	true_false	["True","False"]	False	10.00	3	2026-03-27 02:35:59	2026-03-27 02:35:59
4	2	Which CSS property controls the text size?	multiple_choice	{"A":"font-size","B":"text-size","C":"font-weight","D":"text-style"}	A	10.00	1	2026-03-27 02:35:59	2026-03-27 02:35:59
5	2	The CSS box model includes margin, border, padding, and content.	true_false	{"A":"True","B":"False"}	A	10.00	2	2026-03-27 02:35:59	2026-03-27 02:35:59
6	2	Which property is used to make a flex container?	multiple_choice	{"A":"display: block","B":"display: flex","C":"position: flex","D":"flex: 1"}	B	10.00	3	2026-03-27 02:35:59	2026-03-27 02:35:59
7	2	In your own words, explain the difference between margin and padding in CSS.	essay	\N	\N	10.00	4	2026-03-27 02:35:59	2026-03-27 02:35:59
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, user_id, ip_address, user_agent, payload, last_activity) FROM stdin;
dO1tByc4CqXcZ1P4fbSvgzHuRBF8UevXekSDvtyi	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	eyJfdG9rZW4iOiIzQlYxU0VnQ296TW9VMVBzc3Y2ZjdQbUpJUjBrVDF2ZTdXM2Z4WjNTIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAwIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19	1774579202
d7FsWAPHiXckBcZr55REXtvS1gnsCmziPhmu0Lly	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	eyJfdG9rZW4iOiI0S2hVdDRUWlFRSVF4ZlBldlVJd0dFWmtDVXhCaHhWS243dzQ3N1R3IiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2xvY2FsaG9zdDo4MDAwIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19	1774585606
lZuhVU5wAoNqZ34BAfH8HiHNR8lsVnFfh8xFctHs	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	eyJfdG9rZW4iOiJpbzUxeEJCS0NkSkJjOUFGME5RbGlRVmhrYXZaeTZQNWxHOVJpVlh5IiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAwIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19	1776799871
\.


--
-- Data for Name: submission_answers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.submission_answers (id, submission_id, question_id, answer_text, is_correct, points_earned, ai_feedback, created_at, updated_at) FROM stdin;
1	1	1	Hyper Text Markup Language	t	10.00	\N	2026-03-27 02:35:59	2026-03-27 02:35:59
2	1	2	<a>	t	10.00	\N	2026-03-27 02:35:59	2026-03-27 02:35:59
3	1	3	True	f	0.00	\N	2026-03-27 02:35:59	2026-03-27 02:35:59
4	2	1	Hyper Text Markup Language	t	10.00	\N	2026-03-27 02:35:59	2026-03-27 02:35:59
5	2	2	<a>	t	10.00	\N	2026-03-27 02:35:59	2026-03-27 02:35:59
6	2	3	True	f	0.00	\N	2026-03-27 02:35:59	2026-03-27 02:35:59
7	3	1	Hyper Text Markup Language	t	10.00	\N	2026-03-27 02:35:59	2026-03-27 02:35:59
8	3	2	<a>	t	10.00	\N	2026-03-27 02:35:59	2026-03-27 02:35:59
9	3	3	True	f	0.00	\N	2026-03-27 02:35:59	2026-03-27 02:35:59
10	4	1	Hyper Text Markup Language	t	10.00	\N	2026-03-27 02:35:59	2026-03-27 02:35:59
11	4	2	<a>	t	10.00	\N	2026-03-27 02:35:59	2026-03-27 02:35:59
12	4	3	True	f	0.00	\N	2026-03-27 02:35:59	2026-03-27 02:35:59
\.


--
-- Data for Name: submissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.submissions (id, user_id, assessment_id, attempt_number, score, total_points, percentage, status, ai_feedback, started_at, submitted_at, graded_at, created_at, updated_at) FROM stdin;
1	3	1	1	20.00	30.00	66.67	graded	\N	2026-03-24 02:35:59	2026-03-24 02:55:59	2026-03-25 02:35:59	2026-03-27 02:35:59	2026-03-27 02:35:59
3	5	1	1	20.00	30.00	66.67	graded	\N	2026-03-24 02:35:59	2026-03-24 02:55:59	2026-03-25 02:35:59	2026-03-27 02:35:59	2026-03-27 02:35:59
4	6	1	1	20.00	30.00	66.67	graded	\N	2026-03-24 02:35:59	2026-03-24 02:55:59	2026-03-25 02:35:59	2026-03-27 02:35:59	2026-03-27 02:35:59
5	3	1	2	\N	\N	\N	in_progress	\N	2026-04-23 03:22:35	\N	\N	2026-04-23 03:22:35	2026-04-23 03:22:35
2	4	1	1	20.00	30.00	66.67	graded	\N	2026-03-24 02:35:59	2026-03-24 02:55:59	2026-04-27 10:39:05	2026-03-27 02:35:59	2026-04-27 10:39:05
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, first_name, last_name, email, email_verified_at, password, role, google_id, avatar, is_active, last_login_at, remember_token, created_at, updated_at) FROM stdin;
11	Fiona	Canas	fionayvonne.canas@my.jru.edu	2026-04-26 14:49:42	$2y$12$BN1Tg1bUoU3jCkCMxWAWBOimblCQgSotpXEIlq1cit2lscm.rs6RG	student	\N	\N	t	2026-04-26 14:49:56	\N	2026-04-26 14:49:24	2026-04-26 14:52:42
5	Carlos	Mendoza	student3@demo.com	2026-04-26 14:55:52	$2y$12$eHIm4NFZ2urAhmDy12RqNeVUEXVgOFrX/co8vq9oBBzejTIGKXpCa	student	\N	\N	t	\N	\N	2026-03-27 02:35:58	2026-04-26 14:55:52
6	Ana	Garcia	student4@demo.com	2026-04-26 14:55:52	$2y$12$bW7Ku3nNBFEEVXayy5qNkOIQbsXydWzjFalEmaAdH3Z3pmQz//mgS	student	\N	\N	t	\N	\N	2026-03-27 02:35:59	2026-04-26 14:55:52
8	Johann	Cuisia	jmcuisia@gmail.com	2026-04-26 14:55:52	$2y$12$PSsuwwhmeoZs9sG1T68TTe/g2DTgApIQTRe1cojPtPnYOBteJhs9m	student	\N	\N	t	\N	\N	2026-04-26 12:15:15	2026-04-26 14:55:52
9	Johann Maier	Cuisia	jmcuisiaa@gmail.com	2026-04-26 14:55:52	$2y$12$w7nk2cKZRbNEpjIE.mvquOoXRut2.8ZW2UFXJquPQLGswVf0vxcyW	student	\N	\N	t	2026-04-26 13:22:23	\N	2026-04-26 13:21:10	2026-04-26 14:55:52
10	Fiona	Canas	canasfionayvonne@gmail.com	2026-04-26 14:55:52	$2y$12$SyyR9XGU/zRSnx8sZNoKt.kqotORaMQwTEMTrcFi/wh8XJhYf5ehO	student	\N	\N	t	\N	\N	2026-04-26 14:40:56	2026-04-26 14:55:52
14	Hainz	Pallasigue	pallasiguehainzgabriel19@gmail.com	2026-05-03 14:44:39	$2y$12$gNjntK.9Q5xEXeUluLpPkumTbixuHVn5eAphTuU5lDT7G6m0/lex6	student	\N	\N	t	2026-05-03 14:47:01	\N	2026-05-03 14:42:28	2026-05-03 15:13:23
12	Fiona	Cañas	fionayvonne.canas@gmail.com	2026-04-27 09:50:47	$2y$12$p/9uoYoUGYp4BDHoDd3tx.9jmNPQHfxPq8X5X.SRE4JjtteQdyGPq	student	\N	\N	t	2026-04-27 09:52:44	\N	2026-04-27 09:50:07	2026-04-27 09:54:52
13	princess	yuo	jkwisha.dev@gmail.com	\N	$2y$12$4i3pQm6pdjIWGCinDdMZzeJUxH1J.IF6G4Gbp9OYvGXD.8CCegB9G	instructor	\N	\N	t	\N	\N	2026-04-27 09:57:16	2026-04-27 09:57:16
4	Maria	Reyes	student2@demo.com	2026-04-26 14:55:52	$2y$12$LL0lDc7bhMrfUEYNqof8duA6qKI8Rl7z.q6c.sGlDaVj8SfbTy4sK	student	\N	\N	t	2026-05-03 22:05:17	\N	2026-03-27 02:35:58	2026-05-03 22:05:17
1	Admin	User	admin@demo.com	2026-04-26 14:55:52	$2y$12$OwVkgZKIt6Mv6pZRKbHGKepFN0EyKwFkE2x4B7BuQXsEuv/7hHzEa	admin	\N	\N	t	2026-05-03 22:23:44	\N	2026-03-27 02:35:58	2026-05-03 22:23:44
3	Juan	Dela Cruz	student1@demo.com	2026-04-26 14:55:52	$2y$12$E/72y8pz57.eaYq0NqCyNeq5NGcUjO6W64XmhwLMDlPNzG9sjVTMK	student	\N	\N	t	2026-05-04 03:26:03	\N	2026-03-27 02:35:58	2026-05-04 03:26:03
2	Jane	Santos	instructor@demo.com	2026-04-26 14:55:52	$2y$12$rl9pfAAyA97dSVVFL50.j.KdCu8a/zRYuadfFwu/7.9lGg58aIpHO	instructor	\N	\N	t	2026-05-04 03:28:58	\N	2026-03-27 02:35:58	2026-05-04 03:28:58
\.


--
-- Name: announcements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.announcements_id_seq', 5, true);


--
-- Name: assessments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.assessments_id_seq', 7, true);


--
-- Name: calendar_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.calendar_events_id_seq', 4, true);


--
-- Name: courses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.courses_id_seq', 3, true);


--
-- Name: enrollments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.enrollments_id_seq', 7, true);


--
-- Name: failed_jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.failed_jobs_id_seq', 1, false);


--
-- Name: grades_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.grades_id_seq', 5, true);


--
-- Name: jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.jobs_id_seq', 1, false);


--
-- Name: lesson_materials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lesson_materials_id_seq', 11, true);


--
-- Name: lesson_progress_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lesson_progress_id_seq', 12, true);


--
-- Name: lessons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lessons_id_seq', 6, true);


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.migrations_id_seq', 12, true);


--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.personal_access_tokens_id_seq', 64, true);


--
-- Name: questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.questions_id_seq', 11, true);


--
-- Name: submission_answers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.submission_answers_id_seq', 14, true);


--
-- Name: submissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.submissions_id_seq', 6, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 14, true);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: assessments assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_pkey PRIMARY KEY (id);


--
-- Name: cache_locks cache_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cache_locks
    ADD CONSTRAINT cache_locks_pkey PRIMARY KEY (key);


--
-- Name: cache cache_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cache
    ADD CONSTRAINT cache_pkey PRIMARY KEY (key);


--
-- Name: calendar_events calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);


--
-- Name: courses courses_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_code_unique UNIQUE (code);


--
-- Name: courses courses_join_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_join_code_unique UNIQUE (join_code);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_user_id_course_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_user_id_course_id_unique UNIQUE (user_id, course_id);


--
-- Name: failed_jobs failed_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_uuid_unique UNIQUE (uuid);


--
-- Name: grades grades_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_pkey PRIMARY KEY (id);


--
-- Name: grades grades_user_id_course_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_user_id_course_id_unique UNIQUE (user_id, course_id);


--
-- Name: job_batches job_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_batches
    ADD CONSTRAINT job_batches_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: lesson_materials lesson_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_materials
    ADD CONSTRAINT lesson_materials_pkey PRIMARY KEY (id);


--
-- Name: lesson_progress lesson_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_pkey PRIMARY KEY (id);


--
-- Name: lesson_progress lesson_progress_user_id_lesson_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_user_id_lesson_id_unique UNIQUE (user_id, lesson_id);


--
-- Name: lessons lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (email);


--
-- Name: personal_access_tokens personal_access_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_pkey PRIMARY KEY (id);


--
-- Name: personal_access_tokens personal_access_tokens_token_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_token_unique UNIQUE (token);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: submission_answers submission_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submission_answers
    ADD CONSTRAINT submission_answers_pkey PRIMARY KEY (id);


--
-- Name: submissions submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_google_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_unique UNIQUE (google_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: announcements_course_id_created_at_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX announcements_course_id_created_at_index ON public.announcements USING btree (course_id, created_at);


--
-- Name: assessments_course_id_type_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX assessments_course_id_type_index ON public.assessments USING btree (course_id, type);


--
-- Name: assessments_topic_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX assessments_topic_index ON public.assessments USING btree (topic);


--
-- Name: cache_expiration_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX cache_expiration_index ON public.cache USING btree (expiration);


--
-- Name: cache_locks_expiration_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX cache_locks_expiration_index ON public.cache_locks USING btree (expiration);


--
-- Name: calendar_events_course_id_start_date_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX calendar_events_course_id_start_date_index ON public.calendar_events USING btree (course_id, start_date);


--
-- Name: courses_status_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX courses_status_index ON public.courses USING btree (status);


--
-- Name: enrollments_status_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX enrollments_status_index ON public.enrollments USING btree (status);


--
-- Name: jobs_queue_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX jobs_queue_index ON public.jobs USING btree (queue);


--
-- Name: lesson_progress_status_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lesson_progress_status_index ON public.lesson_progress USING btree (status);


--
-- Name: lessons_course_id_order_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lessons_course_id_order_index ON public.lessons USING btree (course_id, "order");


--
-- Name: personal_access_tokens_expires_at_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX personal_access_tokens_expires_at_index ON public.personal_access_tokens USING btree (expires_at);


--
-- Name: personal_access_tokens_tokenable_type_tokenable_id_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX personal_access_tokens_tokenable_type_tokenable_id_index ON public.personal_access_tokens USING btree (tokenable_type, tokenable_id);


--
-- Name: questions_assessment_id_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX questions_assessment_id_index ON public.questions USING btree (assessment_id);


--
-- Name: sessions_last_activity_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sessions_last_activity_index ON public.sessions USING btree (last_activity);


--
-- Name: sessions_user_id_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sessions_user_id_index ON public.sessions USING btree (user_id);


--
-- Name: submission_answers_submission_id_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX submission_answers_submission_id_index ON public.submission_answers USING btree (submission_id);


--
-- Name: submissions_status_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX submissions_status_index ON public.submissions USING btree (status);


--
-- Name: submissions_user_id_assessment_id_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX submissions_user_id_assessment_id_index ON public.submissions USING btree (user_id, assessment_id);


--
-- Name: users_is_active_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_is_active_index ON public.users USING btree (is_active);


--
-- Name: users_role_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_role_index ON public.users USING btree (role);


--
-- Name: announcements announcements_course_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_course_id_foreign FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: announcements announcements_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: assessments assessments_course_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_course_id_foreign FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: assessments assessments_lesson_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_lesson_id_foreign FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE SET NULL;


--
-- Name: calendar_events calendar_events_course_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_course_id_foreign FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: calendar_events calendar_events_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: courses courses_instructor_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_instructor_id_foreign FOREIGN KEY (instructor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: enrollments enrollments_course_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_course_id_foreign FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: enrollments enrollments_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: grades grades_course_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_course_id_foreign FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: grades grades_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: lesson_materials lesson_materials_lesson_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_materials
    ADD CONSTRAINT lesson_materials_lesson_id_foreign FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: lesson_progress lesson_progress_lesson_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_lesson_id_foreign FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: lesson_progress lesson_progress_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: lessons lessons_course_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_course_id_foreign FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: questions questions_assessment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_assessment_id_foreign FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;


--
-- Name: submission_answers submission_answers_question_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submission_answers
    ADD CONSTRAINT submission_answers_question_id_foreign FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: submission_answers submission_answers_submission_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submission_answers
    ADD CONSTRAINT submission_answers_submission_id_foreign FOREIGN KEY (submission_id) REFERENCES public.submissions(id) ON DELETE CASCADE;


--
-- Name: submissions submissions_assessment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_assessment_id_foreign FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;


--
-- Name: submissions submissions_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 7IgXOHnSo2zStWimSpnHXEoTAfXUNRdauOM0wUUR4ISeen0UGAWQDbFg8G4lX9m

