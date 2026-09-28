--
-- PostgreSQL database dump
--

\restrict Serxc5tT6LThsum8DuWK20XxmGgbXW0FiANlG67ER24kcmcak2DxEyMxh2cJTzD

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
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.courses (id, name, code, description, instructor_id, semester, section, status, created_at, updated_at, join_code) FROM stdin;
1	Introduction to Web Development	WEB101	Covers the fundamentals of HTML, CSS, JavaScript, and backend development.	2	1st Semester 2026	A	active	2026-03-27 02:35:59	2026-05-03 14:48:50	\N
\.


--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.announcements (id, course_id, user_id, title, content, is_pinned, created_at, updated_at) FROM stdin;
1	1	2	Welcome to WEB101!	Hello everyone! Please review the course syllabus before our first meeting.	t	2026-03-27 02:35:59	2026-03-27 02:35:59
2	1	2	Quiz 1 Schedule	Quiz 1 covering HTML basics will be held next week. Good luck!	f	2026-03-27 02:35:59	2026-03-27 02:35:59
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
-- PostgreSQL database dump complete
--

\unrestrict Serxc5tT6LThsum8DuWK20XxmGgbXW0FiANlG67ER24kcmcak2DxEyMxh2cJTzD

