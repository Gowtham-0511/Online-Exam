--WARNING! ERRORS ENCOUNTERED DURING SQL PARSING!
-- DROP SCHEMA public;
CREATE SCHEMA PUBLIC AUTHORIZATION pg_database_owner;

-- DROP SEQUENCE public."AssessmentUserMapping_id_seq";
CREATE SEQUENCE PUBLIC."AssessmentUserMapping_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE;

-- DROP SEQUENCE public."CheatingDetectionAnalysis_id_seq";
CREATE SEQUENCE PUBLIC."CheatingDetectionAnalysis_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE;

-- DROP SEQUENCE public."CodeSimilarityFlags_id_seq";
CREATE SEQUENCE PUBLIC."CodeSimilarityFlags_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE;

-- DROP SEQUENCE public."ExamAutoSave_id_seq";
CREATE SEQUENCE PUBLIC."ExamAutoSave_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE;

-- DROP SEQUENCE public."ExamBehaviorTracking_id_seq";
CREATE SEQUENCE PUBLIC."ExamBehaviorTracking_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE;

-- DROP SEQUENCE public."ExternalUsers_id_seq";
CREATE SEQUENCE PUBLIC."ExternalUsers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE;

-- DROP SEQUENCE public."PracticeProgress_id_seq";
CREATE SEQUENCE PUBLIC."PracticeProgress_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE;

-- DROP SEQUENCE public."PracticeQuestions_id_seq";
CREATE SEQUENCE PUBLIC."PracticeQuestions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE;

-- DROP SEQUENCE public."PracticeSubmissions_id_seq";
CREATE SEQUENCE PUBLIC."PracticeSubmissions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE;

-- DROP SEQUENCE public."UserExamActions_id_seq";
CREATE SEQUENCE PUBLIC."UserExamActions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE;

-- DROP SEQUENCE public."UserInsightsCache_id_seq";
CREATE SEQUENCE PUBLIC."UserInsightsCache_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE;

-- DROP SEQUENCE public."UserProfile_id_seq";
CREATE SEQUENCE PUBLIC."UserProfile_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE;

-- DROP SEQUENCE public.abm_id_seq;
CREATE SEQUENCE PUBLIC.abm_id_seq INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE;

-- DROP SEQUENCE public.assessment_id_seq;
CREATE SEQUENCE PUBLIC.assessment_id_seq INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE;

-- DROP SEQUENCE public.batch_id_seq;
CREATE SEQUENCE PUBLIC.batch_id_seq INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE;

-- DROP SEQUENCE public.exam_files_id_seq;
CREATE SEQUENCE PUBLIC.exam_files_id_seq INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE;

-- DROP SEQUENCE public.exam_progress_id_seq;
CREATE SEQUENCE PUBLIC.exam_progress_id_seq INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE;

-- DROP SEQUENCE public.failed_submissions_id_seq;
CREATE SEQUENCE PUBLIC.failed_submissions_id_seq INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE;

-- DROP SEQUENCE public.practice_attempts_id_seq;
CREATE SEQUENCE PUBLIC.practice_attempts_id_seq INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE;

-- DROP SEQUENCE public.practice_topics_id_seq;
CREATE SEQUENCE PUBLIC.practice_topics_id_seq INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE;

-- DROP SEQUENCE public.questionoptions_id_seq;
CREATE SEQUENCE PUBLIC.questionoptions_id_seq INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE;

-- DROP SEQUENCE public.questions_id_seq;
CREATE SEQUENCE PUBLIC.questions_id_seq INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE;

-- DROP SEQUENCE public.submissions_id_seq;
CREATE SEQUENCE PUBLIC.submissions_id_seq INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE;

-- DROP SEQUENCE public.users_id_seq;
CREATE SEQUENCE PUBLIC.users_id_seq INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE;-- public."Assessment" definition

-- Drop table
-- DROP TABLE public."Assessment";
CREATE TABLE PUBLIC."Assessment" (
	id int4 DEFAULT nextval('assessment_id_seq'::regclass) NOT NULL
	,title VARCHAR(255) NULL
	,"language" VARCHAR(100) NULL
	,duration int4 NULL
	,"createdBy" VARCHAR(255) NULL
	,"createdAt" TIMESTAMP NULL
	,"isExamProctored" bool NULL
	,"isGeneratedFromExcel" bool NULL
	,"questionConfig" VARCHAR NULL
	,questions VARCHAR NULL
	,"startTime" VARCHAR(100) NULL
	,"endTime" VARCHAR(100) NULL
	,"allowedUsers" VARCHAR NULL
	,"sqlCredentialId" VARCHAR(255) NULL
	,"assignmentType" VARCHAR(20) DEFAULT 'batch'::CHARACTER VARYING NULL
	,CONSTRAINT "Assessment_assignmentType_check" CHECK ((("assignmentType")::TEXT = ANY ((ARRAY ['batch'::character varying, 'users'::character varying])::TEXT [])))
	,CONSTRAINT assessment_pkey PRIMARY KEY (id)
	);

-- public."AssessmentBatchMapping" definition
-- Drop table
-- DROP TABLE public."AssessmentBatchMapping";
CREATE TABLE PUBLIC."AssessmentBatchMapping" (
	id int4 DEFAULT nextval('abm_id_seq'::regclass) NULL
	,"assessmentId" int4 NULL
	,"batchId" int4 NULL
	,"startTime" TIMESTAMP NULL
	,"endTime" TIMESTAMP NULL
	,"createdAt" TIMESTAMP DEFAULT now() NULL
	,"isActive" bool DEFAULT true NULL
	);

-- public."Batch" definition
-- Drop table
-- DROP TABLE public."Batch";
CREATE TABLE PUBLIC."Batch" (
	"Id" int4 DEFAULT nextval('batch_id_seq'::regclass) NULL
	,"Name" VARCHAR(100) NULL
	,"EmployeeCount" int4 NULL
	,"Employees" VARCHAR NULL
	,"CreatedAt" TIMESTAMP NULL
	,"UpdatedAt" TIMESTAMP NULL
	);

-- public."Candidates" definition
-- Drop table
-- DROP TABLE public."Candidates";
CREATE TABLE PUBLIC."Candidates" (
	id int4 NULL
	,email VARCHAR(255) NULL
	,"name" VARCHAR(255) NULL
	,created_at TIMESTAMP NULL
	,updated_at TIMESTAMP NULL
	,schedule_start TIMESTAMP NULL
	,schedule_end TIMESTAMP NULL
	,is_active bool NULL
	,examid int4 NULL
	,"password" VARCHAR(100) NULL
	);

-- public."CheatingDetectionAnalysis" definition
-- Drop table
-- DROP TABLE public."CheatingDetectionAnalysis";
CREATE TABLE PUBLIC."CheatingDetectionAnalysis" (
	id serial4 NOT NULL
	,"examId" VARCHAR(255) NOT NULL
	,"userEmail" VARCHAR(255) NOT NULL
	,"riskScore" int4 NOT NULL
	,"riskLevel" VARCHAR(20) NOT NULL
	,flags jsonb NOT NULL
	,"timestamp" TIMESTAMP DEFAULT now() NULL
	,CONSTRAINT "CheatingDetectionAnalysis_examId_userEmail_key" UNIQUE (
		"examId"
		,"userEmail"
		)
	,CONSTRAINT "CheatingDetectionAnalysis_pkey" PRIMARY KEY (id)
	);

CREATE INDEX idx_cheating_exam ON PUBLIC."CheatingDetectionAnalysis" USING btree ("examId");

CREATE INDEX idx_cheating_risk ON PUBLIC."CheatingDetectionAnalysis" USING btree ("riskLevel");

-- public."CodeSimilarityFlags" definition
-- Drop table
-- DROP TABLE public."CodeSimilarityFlags";
CREATE TABLE PUBLIC."CodeSimilarityFlags" (
	id serial4 NOT NULL
	,"examId" VARCHAR(255) NOT NULL
	,"userEmail" VARCHAR(255) NOT NULL
	,"questionId" VARCHAR(255) NOT NULL
	,matches jsonb NOT NULL
	,"timestamp" TIMESTAMP DEFAULT now() NULL
	,CONSTRAINT "CodeSimilarityFlags_examId_userEmail_questionId_key" UNIQUE (
		"examId"
		,"userEmail"
		,"questionId"
		)
	,CONSTRAINT "CodeSimilarityFlags_pkey" PRIMARY KEY (id)
	);

CREATE INDEX idx_similarity_exam ON PUBLIC."CodeSimilarityFlags" USING btree ("examId");

CREATE INDEX idx_similarity_timestamp ON PUBLIC."CodeSimilarityFlags" USING btree ("timestamp");

-- public."Employees" definition
-- Drop table
-- DROP TABLE public."Employees";
CREATE TABLE PUBLIC."Employees" (
	"Id" int4 NULL
	,"EmployeeId" VARCHAR(20) NULL
	,"Name" VARCHAR(100) NULL
	,"Email" VARCHAR(255) NULL
	,"Department" VARCHAR(100) NULL
	,"Position" VARCHAR(100) NULL
	,"Avatar" VARCHAR NULL
	);

-- public."ExamAutoSave" definition
-- Drop table
-- DROP TABLE public."ExamAutoSave";
CREATE TABLE PUBLIC."ExamAutoSave" (
	id serial4 NOT NULL
	,"examId" VARCHAR(255) NOT NULL
	,"userEmail" VARCHAR(255) NOT NULL
	,answers jsonb NOT NULL
	,"flaggedQuestions" jsonb NULL
	,"timeLeft" int4 NULL
	,"lastUpdated" TIMESTAMP NOT NULL
	,"createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL
	,CONSTRAINT "ExamAutoSave_examId_userEmail_key" UNIQUE (
		"examId"
		,"userEmail"
		)
	,CONSTRAINT "ExamAutoSave_pkey" PRIMARY KEY (id)
	);

CREATE INDEX idx_exam_autosave_user ON PUBLIC."ExamAutoSave" USING btree (
	"examId"
	,"userEmail"
	);

-- public."ExamBehaviorTracking" definition
-- Drop table
-- DROP TABLE public."ExamBehaviorTracking";
CREATE TABLE PUBLIC."ExamBehaviorTracking" (
	id serial4 NOT NULL
	,"examId" VARCHAR(255) NOT NULL
	,"userEmail" VARCHAR(255) NOT NULL
	,"questionId" VARCHAR(255) NULL
	,"questionIndex" int4 NULL
	,"behaviorType" VARCHAR(100) NOT NULL
	,metadata jsonb NULL
	,"timestamp" TIMESTAMP DEFAULT now() NULL
	,CONSTRAINT "ExamBehaviorTracking_pkey" PRIMARY KEY (id)
	);

CREATE INDEX idx_behavior_exam_user ON PUBLIC."ExamBehaviorTracking" USING btree (
	"examId"
	,"userEmail"
	);

CREATE INDEX idx_behavior_timestamp ON PUBLIC."ExamBehaviorTracking" USING btree ("timestamp");

-- public."Exams" definition
-- Drop table
-- DROP TABLE public."Exams";
CREATE TABLE PUBLIC."Exams" (
	id int4 NULL
	,title VARCHAR(255) NULL
	,description VARCHAR NULL
	,"createdAt" TIMESTAMP NULL
	);

-- public."ExternalUsers" definition
-- Drop table
-- DROP TABLE public."ExternalUsers";
CREATE TABLE PUBLIC."ExternalUsers" (
	id serial4 NOT NULL
	,email VARCHAR(255) NOT NULL
	,"name" VARCHAR(255) NULL
	,"password" VARCHAR(255) NULL
	,"role" VARCHAR(50) DEFAULT 'student'::CHARACTER VARYING NULL
	,"createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL
	,"updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL
	,provider VARCHAR(50) NULL
	,CONSTRAINT "ExternalUsers_email_key" UNIQUE (email)
	,CONSTRAINT "ExternalUsers_pkey" PRIMARY KEY (id)
	);

CREATE INDEX idx_externalusers_email ON PUBLIC."ExternalUsers" USING btree (email);

-- public."JobSkillMapping" definition
-- Drop table
-- DROP TABLE public."JobSkillMapping";
CREATE TABLE PUBLIC."JobSkillMapping" (
	"jobId" int4 NULL
	,"skillId" int4 NULL
	);

-- public."LearningPlan" definition
-- Drop table
-- DROP TABLE public."LearningPlan";
CREATE TABLE PUBLIC."LearningPlan" (
	id VARCHAR(100) NOT NULL
	,"name" VARCHAR(255) NOT NULL
	,description TEXT NOT NULL
	,"language" VARCHAR(50) NOT NULL
	,difficulty VARCHAR(20) NULL
	,duration int4 NOT NULL
	,weeks jsonb DEFAULT '[]'::jsonb NOT NULL
	,"createdBy" VARCHAR(255) NOT NULL
	,"createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL
	,"updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL
	,"isActive" bool DEFAULT true NULL
	,tags _text NULL
	,CONSTRAINT "LearningPlan_difficulty_check" CHECK (((difficulty)::TEXT = ANY ((ARRAY ['beginner'::character varying, 'intermediate'::character varying, 'advanced'::character varying])::TEXT [])))
	,CONSTRAINT "LearningPlan_duration_check" CHECK (
		(
			(duration > 0)
			AND (duration <= 52)
			)
		)
	,CONSTRAINT "LearningPlan_pkey" PRIMARY KEY (id)
	);

CREATE INDEX idx_learning_plans_active ON PUBLIC."LearningPlan" USING btree ("isActive");

CREATE INDEX idx_learning_plans_created_by ON PUBLIC."LearningPlan" USING btree ("createdBy");

CREATE INDEX idx_learning_plans_difficulty ON PUBLIC."LearningPlan" USING btree (difficulty);

CREATE INDEX idx_learning_plans_language ON PUBLIC."LearningPlan" USING btree (LANGUAGE);

-- Table Triggers
CREATE TRIGGER update_learning_plan_updated_at before

UPDATE ON PUBLIC."LearningPlan"
FOR each row

EXECUTE FUNCTION update_updated_at_column();

-- public."PracticeProgress" definition
-- Drop table
-- DROP TABLE public."PracticeProgress";
CREATE TABLE PUBLIC."PracticeProgress" (
	id serial4 NOT NULL
	,email VARCHAR(255) NOT NULL
	,"totalPracticeQuestions" int4 DEFAULT 0 NULL
	,"questionsCompleted" int4 DEFAULT 0 NULL
	,"questionsAttempted" int4 DEFAULT 0 NULL
	,"languageProgress" jsonb NULL
	,"topicProgress" jsonb NULL
	,"currentStreak" int4 DEFAULT 0 NULL
	,"longestStreak" int4 DEFAULT 0 NULL
	,"lastPracticeDate" DATE NULL
	,"averageScore" NUMERIC(5, 2) DEFAULT 0 NULL
	,"improvementRate" NUMERIC(5, 2) DEFAULT 0 NULL
	,"updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL
	,CONSTRAINT "PracticeProgress_email_key" UNIQUE (email)
	,CONSTRAINT "PracticeProgress_pkey" PRIMARY KEY (id)
	);

CREATE INDEX idx_practice_progress_email ON PUBLIC."PracticeProgress" USING btree (email);

-- public."PracticeQuestions" definition
-- Drop table
-- DROP TABLE public."PracticeQuestions";
CREATE TABLE PUBLIC."PracticeQuestions" (
	id serial4 NOT NULL
	,"generatedFor" VARCHAR(255) NOT NULL
	,"language" VARCHAR(50) NOT NULL
	,difficulty VARCHAR(20) NOT NULL
	,topic VARCHAR(100) NULL
	,"weakArea" TEXT NULL
	,"questionTitle" TEXT NOT NULL
	,"questionDescription" TEXT NOT NULL
	,"starterCode" TEXT NULL
	,"testCases" jsonb NULL
	,"expectedOutput" TEXT NULL
	,hints jsonb NULL
	,"solutionCode" TEXT NULL
	,"solutionExplanation" TEXT NULL
	,"basedOnExam" VARCHAR(255) NULL
	,"generatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL
	,"isActive" bool DEFAULT true NULL
	,"attemptCount" int4 DEFAULT 0 NULL
	,"successRate" NUMERIC(5, 2) DEFAULT 0 NULL
	,"mcqOptions" jsonb NULL
	,"type" TEXT NULL
	,question TEXT NULL
	,CONSTRAINT "PracticeQuestions_pkey" PRIMARY KEY (id)
	);

CREATE INDEX idx_practice_difficulty ON PUBLIC."PracticeQuestions" USING btree (difficulty);

CREATE INDEX idx_practice_user_lang ON PUBLIC."PracticeQuestions" USING btree (
	"generatedFor"
	,LANGUAGE
	);

-- public."QuestionOptions" definition
-- Drop table
-- DROP TABLE public."QuestionOptions";
CREATE TABLE PUBLIC."QuestionOptions" (
	id int4 DEFAULT nextval('questionoptions_id_seq'::regclass) NULL
	,"questionId" int4 NULL
	,"optionText" VARCHAR NULL
	,"isCorrect" bool NULL
	);

-- public."QuestionTestCases" definition
-- Drop table
-- DROP TABLE public."QuestionTestCases";
CREATE TABLE PUBLIC."QuestionTestCases" (
	id int4 NULL
	,"questionId" int4 NULL
	,"inputText" VARCHAR NULL
	,"expectedOutput" VARCHAR NULL
	);

-- public."Questions" definition
-- Drop table
-- DROP TABLE public."Questions";
CREATE TABLE PUBLIC."Questions" (
	id int4 DEFAULT nextval('questions_id_seq'::regclass) NULL
	,"questionText" VARCHAR NULL
	,"expectedOutput" VARCHAR NULL
	,difficulty VARCHAR(50) NULL
	,marks int4 NULL
	,"language" VARCHAR(50) NULL
	,"skillId" int4 NULL
	,"jobId" int4 NULL
	,"createdBy" VARCHAR(255) NULL
	,"createdAt" TIMESTAMP NULL
	,"imageUrl" VARCHAR(255) NULL
	,"imageAltText" VARCHAR(255) NULL
	,"questionType" VARCHAR(50) NULL
	,tags _text NULL
	,"testCases" jsonb DEFAULT '[]'::jsonb NULL
	);

CREATE INDEX idx_questions_testcases ON PUBLIC."Questions" USING gin ("testCases");

-- public."Skills" definition
-- Drop table
-- DROP TABLE public."Skills";
CREATE TABLE PUBLIC."Skills" (
	id int4 NULL
	,"name" VARCHAR(255) NULL
	);

-- public."UserExamActions" definition
-- Drop table
-- DROP TABLE public."UserExamActions";
CREATE TABLE PUBLIC."UserExamActions" (
	id serial4 NOT NULL
	,"examId" VARCHAR(255) NOT NULL
	,"userEmail" VARCHAR(255) NOT NULL
	,"questionId" VARCHAR(255) NOT NULL
	,"questionIndex" int4 NOT NULL
	,"actionType" VARCHAR(50) NOT NULL
	,"timeSpent" int4 NULL
	,"codeRunCount" int4 DEFAULT 0 NULL
	,"timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL
	,metadata jsonb NULL
	,CONSTRAINT "UserExamActions_pkey" PRIMARY KEY (id)
	,CONSTRAINT unique_question_session UNIQUE (
		"examId"
		,"userEmail"
		,"questionId"
		,"timestamp"
		)
	);

CREATE INDEX idx_exam_actions_user ON PUBLIC."UserExamActions" USING btree (
	"examId"
	,"userEmail"
	);

CREATE INDEX idx_question_actions ON PUBLIC."UserExamActions" USING btree (
	"questionId"
	,"actionType"
	);

CREATE INDEX idx_user_exam_actions ON PUBLIC."UserExamActions" USING btree (
	"examId"
	,"userEmail"
	);

-- public."UserInsightsCache" definition
-- Drop table
-- DROP TABLE public."UserInsightsCache";
CREATE TABLE PUBLIC."UserInsightsCache" (
	id serial4 NOT NULL
	,email VARCHAR(255) NOT NULL
	,"userName" VARCHAR(255) NULL
	,"aiInsights" jsonb NULL
	,"insightsGeneratedAt" TIMESTAMP NULL
	,"performancePrediction" jsonb NULL
	,"predictionGeneratedAt" TIMESTAMP NULL
	,"achievementPredictions" jsonb NULL
	,"achievementsGeneratedAt" TIMESTAMP NULL
	,"lastExamSubmittedAt" TIMESTAMP NULL
	,"totalExamsCount" int4 DEFAULT 0 NULL
	,"createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL
	,"updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL
	,CONSTRAINT "UserInsightsCache_email_key" UNIQUE (email)
	,CONSTRAINT "UserInsightsCache_pkey" PRIMARY KEY (id)
	);

CREATE INDEX idx_user_insights_email ON PUBLIC."UserInsightsCache" USING btree (email);

-- public."UserProfile" definition
-- Drop table
-- DROP TABLE public."UserProfile";
CREATE TABLE PUBLIC."UserProfile" (
	id serial4 NOT NULL
	,user_email VARCHAR(255) NOT NULL
	,bio TEXT NULL
	,"location" VARCHAR(255) NULL
	,occupation VARCHAR(255) NULL
	,github_url VARCHAR(255) NULL
	,linkedin_url VARCHAR(255) NULL
	,website_url VARCHAR(255) NULL
	,created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL
	,updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL
	,profile_image TEXT NULL
	,CONSTRAINT "UserProfile_pkey" PRIMARY KEY (id)
	,CONSTRAINT "UserProfile_user_email_key" UNIQUE (user_email)
	);

CREATE INDEX idx_user_profile_email ON PUBLIC."UserProfile" USING btree (user_email);

-- public.allocation_history definition
-- Drop table
-- DROP TABLE public.allocation_history;
CREATE TABLE PUBLIC.allocation_history (
	"role" TEXT NULL
	,clientname TEXT NULL
	,projectleademployeeid TEXT NULL
	,expectedbillablehours TEXT NULL
	,projectname TEXT NULL
	,projectleadname TEXT NULL
	,projectcode TEXT NULL
	,enddate TEXT NULL
	,deliverymanagername TEXT NULL
	,statecode TEXT NULL
	,startdate TEXT NULL
	,employeeid TEXT NULL
	,"comments" TEXT NULL
	,billingstatus TEXT NULL
	,deliverymanageremployeeid TEXT NULL
	,supervisoremployeeid TEXT NULL
	,supervisorname TEXT NULL
	,allocationstatus TEXT NULL
	,employeename TEXT NULL
	,technologiesused TEXT NULL
	);

-- public.battle_queue definition
-- Drop table
-- DROP TABLE public.battle_queue;
CREATE TABLE PUBLIC.battle_queue (
	id uuid NOT NULL
	,user_id uuid NULL
	,skill_level int4 NULL
	,joined_at TIMESTAMP NULL
	,STATUS VARCHAR(20) NULL
	,CONSTRAINT battle_queue_pkey PRIMARY KEY (id)
	);

-- public.battle_submissions definition
-- Drop table
-- DROP TABLE public.battle_submissions;
CREATE TABLE PUBLIC.battle_submissions (
	id uuid NOT NULL
	,battle_id uuid NULL
	,user_id uuid NULL
	,code TEXT NULL
	,"language" VARCHAR(20) NULL
	,submitted_at TIMESTAMP NULL
	,test_results jsonb NULL
	,score int4 NULL
	,CONSTRAINT battle_submissions_pkey PRIMARY KEY (id)
	);

-- public.battles definition
-- Drop table
-- DROP TABLE public.battles;
CREATE TABLE PUBLIC.battles (
	id uuid NOT NULL
	,player1_id uuid NULL
	,player2_id uuid NULL
	,problem_id uuid NULL
	,start_time TIMESTAMP NULL
	,end_time TIMESTAMP NULL
	,STATUS VARCHAR(20) NULL
	,winner_id uuid NULL
	,CONSTRAINT battles_pkey PRIMARY KEY (id)
	);

-- public.certificateexams definition
-- Drop table
-- DROP TABLE public.certificateexams;
CREATE TABLE PUBLIC.certificateexams (
	id VARCHAR(36) NOT NULL
	,title VARCHAR(255) NOT NULL
	,description TEXT NULL
	,duration_minutes int4 NOT NULL
	,passing_score int4 NOT NULL
	,created_by VARCHAR(255) NOT NULL
	,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL
	,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL
	,is_published bool DEFAULT false NULL
	,CONSTRAINT certificateexams_pkey PRIMARY KEY (id)
	);

-- public.exam_files definition
-- Drop table
-- DROP TABLE public.exam_files;
CREATE TABLE PUBLIC.exam_files (
	id serial4 NOT NULL
	,exam_id VARCHAR(255) NOT NULL
	,file_name VARCHAR(255) NOT NULL
	,file_url TEXT NOT NULL
	,file_size int8 NOT NULL
	,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL
	,CONSTRAINT exam_files_pkey PRIMARY KEY (id)
	);

CREATE INDEX idx_exam_files_exam_id ON PUBLIC.exam_files USING btree (exam_id);

-- public.exam_progress definition
-- Drop table
-- DROP TABLE public.exam_progress;
CREATE TABLE PUBLIC.exam_progress (
	id serial4 NOT NULL
	,email VARCHAR(255) NOT NULL
	,"examId" VARCHAR(255) NOT NULL
	,answers jsonb DEFAULT '[]'::jsonb NULL
	,"mcqAnswers" jsonb DEFAULT '{}'::jsonb NULL
	,"activeQuestionIndex" int4 DEFAULT 0 NULL
	,"timeLeft" int4 DEFAULT 0 NULL
	,"flaggedQuestions" jsonb DEFAULT '[]'::jsonb NULL
	,"questionTimeSpent" jsonb DEFAULT '{}'::jsonb NULL
	,"codeRunCounts" jsonb DEFAULT '{}'::jsonb NULL
	,"lastSaved" timestamptz DEFAULT now() NULL
	,"createdAt" timestamptz DEFAULT now() NULL
	,"updatedAt" timestamptz DEFAULT now() NULL
	,CONSTRAINT exam_progress_pkey PRIMARY KEY (id)
	,CONSTRAINT exam_progress_unique UNIQUE (
		email
		,"examId"
		)
	);

CREATE INDEX idx_exam_progress_email ON PUBLIC.exam_progress USING btree (email);

CREATE INDEX "idx_exam_progress_email_examId" ON PUBLIC.exam_progress USING btree (
	email
	,"examId"
	);

CREATE INDEX "idx_exam_progress_examId" ON PUBLIC.exam_progress USING btree ("examId");

-- public.failed_submissions definition
-- Drop table
-- DROP TABLE public.failed_submissions;
CREATE TABLE PUBLIC.failed_submissions (
	id serial4 NOT NULL
	,email VARCHAR(255) NOT NULL
	,"examId" VARCHAR(255) NOT NULL
	,"data" jsonb NULL
	,error TEXT NULL
	,"timestamp" TIMESTAMP DEFAULT now() NULL
	,recovered bool DEFAULT false NULL
	,CONSTRAINT failed_submissions_pkey PRIMARY KEY (id)
	);

CREATE INDEX idx_failed_submissions_email ON PUBLIC.failed_submissions USING btree (email);

CREATE INDEX idx_failed_submissions_recovered ON PUBLIC.failed_submissions USING btree (recovered);

-- public.ghost_leaderboard definition
-- Drop table
-- DROP TABLE public.ghost_leaderboard;
CREATE TABLE PUBLIC.ghost_leaderboard (
	user_id uuid NULL
	,anonymous_name VARCHAR(50) NULL
	,score int4 NULL
	,battles_won int4 NULL
	,created_at TIMESTAMP NULL
	,expires_at TIMESTAMP NULL
	);

-- public.practice_attempts definition
-- Drop table
-- DROP TABLE public.practice_attempts;
CREATE TABLE PUBLIC.practice_attempts (
	id serial4 NOT NULL
	,"sessionId" VARCHAR(255) NOT NULL
	,topic VARCHAR(255) NOT NULL
	,difficulty VARCHAR(50) NOT NULL
	,"questionsData" jsonb NOT NULL
	,answers jsonb NOT NULL
	,score NUMERIC(5, 2) NOT NULL
	,"correctAnswers" int4 NOT NULL
	,"totalQuestions" int4 NOT NULL
	,"timeSpent" int4 DEFAULT 0 NULL
	,"completedAt" TIMESTAMP DEFAULT now() NULL
	,CONSTRAINT practice_attempts_pkey PRIMARY KEY (id)
	);

CREATE INDEX "idx_practice_completedAt" ON PUBLIC.practice_attempts USING btree ("completedAt");

CREATE INDEX "idx_practice_sessionId" ON PUBLIC.practice_attempts USING btree ("sessionId");

CREATE INDEX idx_practice_topic ON PUBLIC.practice_attempts USING btree (topic);

-- public.practice_topics definition
-- Drop table
-- DROP TABLE public.practice_topics;
CREATE TABLE PUBLIC.practice_topics (
	id serial4 NOT NULL
	,topic VARCHAR(255) NOT NULL
	,"attemptCount" int4 DEFAULT 0 NULL
	,"averageScore" NUMERIC(5, 2) DEFAULT 0 NULL
	,"lastUpdated" TIMESTAMP DEFAULT now() NULL
	,CONSTRAINT practice_topics_pkey PRIMARY KEY (id)
	,CONSTRAINT practice_topics_topic_key UNIQUE (topic)
	);

CREATE INDEX "idx_topics_attemptCount" ON PUBLIC.practice_topics USING btree ("attemptCount" DESC);

-- public."questionBank" definition
-- Drop table
-- DROP TABLE public."questionBank";
CREATE TABLE PUBLIC."questionBank" (
	id int4 NULL
	,question VARCHAR NULL
	,"expectedOutput" VARCHAR NULL
	,difficulty VARCHAR(100) NULL
	,marks int4 NULL
	,"language" VARCHAR(200) NULL
	,"createdBy" VARCHAR(510) NULL
	,"createdAt" TIMESTAMP NULL
	);

-- public.sql_credentials definition
-- Drop table
-- DROP TABLE public.sql_credentials;
CREATE TABLE PUBLIC.sql_credentials (
	id uuid DEFAULT gen_random_uuid() NOT NULL
	,server_type VARCHAR(50) NOT NULL
	,host VARCHAR(255) NOT NULL
	,port int4 NOT NULL
	,username VARCHAR(255) NOT NULL
	,"password" TEXT NOT NULL
	,database_name VARCHAR(255) NOT NULL
	,exam_title VARCHAR(255) NOT NULL
	,created_by VARCHAR(255) NOT NULL
	,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL
	,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL
	,er_diagram_url TEXT NULL
	,CONSTRAINT sql_credentials_pkey PRIMARY KEY (id)
	);

CREATE INDEX idx_sql_credentials_created_by ON PUBLIC.sql_credentials USING btree (created_by);

CREATE INDEX idx_sql_credentials_exam ON PUBLIC.sql_credentials USING btree (exam_title);

-- public.submissions definition
-- Drop table
-- DROP TABLE public.submissions;
CREATE TABLE PUBLIC.submissions (
	id serial4 NULL
	,email VARCHAR(255) NULL
	,"userName" VARCHAR(255) NULL
	,"examId" VARCHAR NULL
	,answers VARCHAR NULL
	,"answersWithQuestionIds" VARCHAR NULL
	,code VARCHAR NULL
	,disqualified bool NULL
	,"submittedAt" TIMESTAMP NULL
	,ai_feedback TEXT NULL
	,CONSTRAINT unique_email_exam UNIQUE (
		email
		,"examId"
		)
	);

CREATE INDEX idx_submissions_email ON PUBLIC.submissions USING btree (
	email
	,"examId"
	);

CREATE INDEX idx_submissions_email_exam ON PUBLIC.submissions USING btree (
	email
	,"examId"
	);

CREATE INDEX idx_submissions_submitted_at ON PUBLIC.submissions USING btree ("submittedAt");

-- Table Triggers
CREATE TRIGGER trigger_invalidate_insights_cache
AFTER INSERT ON PUBLIC.submissions
FOR each row

EXECUTE FUNCTION invalidate_user_insights_cache();

-- public.sys_employees definition
-- Drop table
-- DROP TABLE public.sys_employees;
CREATE TABLE PUBLIC.sys_employees (
	employeedepartment VARCHAR(50) NULL
	,designation VARCHAR(50) NULL
	,employeeid VARCHAR(50) NULL
	,employeemail VARCHAR(50) NULL
	,employeename VARCHAR(50) NULL
	,employeephoto VARCHAR NULL
	);

-- public.sysdiagrams definition
-- Drop table
-- DROP TABLE public.sysdiagrams;
CREATE TABLE PUBLIC.sysdiagrams (
	"name" VARCHAR(128) NULL
	,principal_id int4 NULL
	,diagram_id int4 NULL
	,"version" int4 NULL
	,DEFINITION TEXT NULL
	);

-- public.users definition
-- Drop table
-- DROP TABLE public.users;
CREATE TABLE PUBLIC.users (
	id serial4 NULL
	,email VARCHAR(255) NULL
	,"name" VARCHAR(255) NULL
	,"role" VARCHAR(50) NULL
	,created_at TIMESTAMP NULL
	,updated_at TIMESTAMP NULL
	,schedule_start TIMESTAMP NULL
	,schedule_end TIMESTAMP NULL
	,is_active bool DEFAULT true NULL
	);

-- public.violation_images definition
-- Drop table
-- DROP TABLE public.violation_images;
CREATE TABLE PUBLIC.violation_images (
	id int4 NULL
	,email VARCHAR(255) NULL
	,"examId" TEXT NULL
	,reason VARCHAR(255) NULL
	,"timestamp" VARCHAR(100) NULL
	,"imageBase64" VARCHAR NULL
	,ai_analysis jsonb NULL
	,ai_confidence int4 NULL
	,severity VARCHAR(20) NULL
	);

-- public."AssessmentUserMapping" definition
-- Drop table
-- DROP TABLE public."AssessmentUserMapping";
CREATE TABLE PUBLIC."AssessmentUserMapping" (
	id serial4 NOT NULL
	,"assessmentId" int4 NOT NULL
	,"userEmail" VARCHAR(255) NOT NULL
	,"createdAt" TIMESTAMP DEFAULT now() NOT NULL
	,"updatedAt" TIMESTAMP DEFAULT now() NULL
	,starttime TIMESTAMP NULL
	,endtime TIMESTAMP NULL
	,CONSTRAINT "AssessmentUserMapping_pkey" PRIMARY KEY (id)
	,CONSTRAINT unique_assessment_user UNIQUE (
		"assessmentId"
		,"userEmail"
		)
	,CONSTRAINT fk_assessment FOREIGN KEY ("assessmentId") REFERENCES PUBLIC."Assessment" (id) ON DELETE CASCADE
	);

CREATE INDEX "idx_assessment_user_assessmentId" ON PUBLIC."AssessmentUserMapping" USING btree ("assessmentId");

CREATE INDEX idx_assessment_user_email ON PUBLIC."AssessmentUserMapping" USING btree ("userEmail");

-- public."LearningPlanNotification" definition
-- Drop table
-- DROP TABLE public."LearningPlanNotification";
CREATE TABLE PUBLIC."LearningPlanNotification" (
	id VARCHAR(100) NOT NULL
	,"userEmail" VARCHAR(255) NOT NULL
	,"planId" VARCHAR(100) NOT NULL
	,"type" VARCHAR(50) NOT NULL
	,title VARCHAR(255) NOT NULL
	,message TEXT NOT NULL
	,"read" bool DEFAULT false NULL
	,"createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL
	,"sentAt" TIMESTAMP NULL
	,CONSTRAINT "LearningPlanNotification_pkey" PRIMARY KEY (id)
	,CONSTRAINT "LearningPlanNotification_type_check" CHECK (((type)::TEXT = ANY ((ARRAY ['assignment'::character varying, 'reminder'::character varying, 'completion'::character varying, 'milestone'::character varying])::TEXT [])))
	,CONSTRAINT fk_notification_plan FOREIGN KEY ("planId") REFERENCES PUBLIC."LearningPlan" (id) ON DELETE CASCADE
	);

CREATE INDEX idx_notifications_plan_id ON PUBLIC."LearningPlanNotification" USING btree ("planId");

CREATE INDEX idx_notifications_read ON PUBLIC."LearningPlanNotification" USING btree (READ);

CREATE INDEX idx_notifications_user_email ON PUBLIC."LearningPlanNotification" USING btree ("userEmail");

-- public."PracticeSubmissions" definition
-- Drop table
-- DROP TABLE public."PracticeSubmissions";
CREATE TABLE PUBLIC."PracticeSubmissions" (
	id serial4 NOT NULL
	,"practiceQuestionId" int4 NULL
	,email VARCHAR(255) NOT NULL
	,"userName" VARCHAR(255) NULL
	,"submittedCode" TEXT NOT NULL
	,"language" VARCHAR(50) NOT NULL
	,"isPassed" bool NULL
	,"testCasesPassed" int4 DEFAULT 0 NULL
	,"totalTestCases" int4 NULL
	,"executionTime" int4 NULL
	,"errorMessage" TEXT NULL
	,"aiFeedback" jsonb NULL
	,score NUMERIC(5, 2) NULL
	,"submittedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL
	,"attemptNumber" int4 DEFAULT 1 NULL
	,CONSTRAINT "PracticeSubmissions_pkey" PRIMARY KEY (id)
	,CONSTRAINT "PracticeSubmissions_practiceQuestionId_fkey" FOREIGN KEY ("practiceQuestionId") REFERENCES PUBLIC."PracticeQuestions" (id)
	);

CREATE INDEX idx_practice_sub_question ON PUBLIC."PracticeSubmissions" USING btree ("practiceQuestionId");

CREATE INDEX idx_practice_sub_user ON PUBLIC."PracticeSubmissions" USING btree (email);

-- Table Triggers
CREATE TRIGGER trigger_update_practice_progress
AFTER INSERT ON PUBLIC."PracticeSubmissions"
FOR each row

EXECUTE FUNCTION update_practice_progress();

-- public."UserLearningPlan" definition
-- Drop table
-- DROP TABLE public."UserLearningPlan";
CREATE TABLE PUBLIC."UserLearningPlan" (
	id VARCHAR(100) NOT NULL
	,"planId" VARCHAR(100) NOT NULL
	,"userEmail" VARCHAR(255) NOT NULL
	,"userName" VARCHAR(255) NOT NULL
	,"assignedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL
	,"startDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
	,"currentWeek" int4 DEFAULT 1 NULL
	,STATUS TEXT DEFAULT 'not-started'::CHARACTER VARYING NULL
	,progress jsonb DEFAULT '[]'::jsonb NULL
	,"overallProgress" int4 DEFAULT 0 NULL
	,"completedAt" TIMESTAMP NULL
	,"lastAccessedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL
	,CONSTRAINT "UserLearningPlan_overallProgress_check" CHECK (
		(
			("overallProgress" >= 0)
			AND ("overallProgress" <= 100)
			)
		)
	,CONSTRAINT "UserLearningPlan_pkey" PRIMARY KEY (id)
	,CONSTRAINT "UserLearningPlan_status_check" CHECK ((STATUS = ANY (ARRAY [('not-started'::character varying)::text, ('in-progress'::character varying)::text, ('completed'::character varying)::text, ('paused'::character varying)::text])))
	,CONSTRAINT unique_user_plan UNIQUE (
		"planId"
		,"userEmail"
		)
	,CONSTRAINT fk_learning_plan FOREIGN KEY ("planId") REFERENCES PUBLIC."LearningPlan" (id) ON DELETE CASCADE
	);

CREATE INDEX idx_user_learning_plans_current_week ON PUBLIC."UserLearningPlan" USING btree ("currentWeek");

CREATE INDEX idx_user_learning_plans_plan_id ON PUBLIC."UserLearningPlan" USING btree ("planId");

CREATE INDEX idx_user_learning_plans_status ON PUBLIC."UserLearningPlan" USING btree (STATUS);

CREATE INDEX idx_user_learning_plans_user_email ON PUBLIC."UserLearningPlan" USING btree ("userEmail");

-- public.certificatequestions definition
-- Drop table
-- DROP TABLE public.certificatequestions;
CREATE TABLE PUBLIC.certificatequestions (
	id VARCHAR(36) NOT NULL
	,exam_id VARCHAR(36) NOT NULL
	,question_text TEXT NOT NULL
	,question_type VARCHAR(50) NOT NULL
	,"options" TEXT NULL
	,correct_answer TEXT NULL
	,points int4 DEFAULT 1 NULL
	,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL
	,CONSTRAINT certificatequestions_pkey PRIMARY KEY (id)
	,CONSTRAINT certificatequestions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES PUBLIC.certificateexams(id) ON DELETE CASCADE
	);

-- public.usercertificates definition
-- Drop table
-- DROP TABLE public.usercertificates;
CREATE TABLE PUBLIC.usercertificates (
	id VARCHAR(36) NOT NULL
	,user_id VARCHAR(255) NOT NULL
	,exam_id VARCHAR(36) NOT NULL
	,issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL
	,certificate_url TEXT NULL
	,score int4 NOT NULL
	,CONSTRAINT usercertificates_pkey PRIMARY KEY (id)
	,CONSTRAINT usercertificates_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES PUBLIC.certificateexams(id) ON DELETE CASCADE
	);

-- DROP FUNCTION public.invalidate_user_insights_cache();
CREATE
	OR REPLACE FUNCTION PUBLIC.invalidate_user_insights_cache ()
RETURNS TRIGGER LANGUAGE plpgsql AS $FUNCTION$

BEGIN
	-- Update or insert cache entry to mark it needs regeneration
	INSERT INTO "UserInsightsCache" (
		email
		,"lastExamSubmittedAt"
		,"totalExamsCount"
		)
	VALUES (
		NEW.email
		,NEW."submittedAt"
		,1
		) ON CONFLICT(email) DO

	UPDATE
	SET "lastExamSubmittedAt" = NEW."submittedAt"
		,"totalExamsCount" = "UserInsightsCache"."totalExamsCount" + 1
		,"updatedAt" = CURRENT_TIMESTAMP;

	RETURN NEW;
END;$FUNCTION$;

-- DROP FUNCTION public.update_practice_progress();
CREATE
	OR REPLACE FUNCTION PUBLIC.update_practice_progress ()
RETURNS TRIGGER LANGUAGE plpgsql AS $FUNCTION$

DECLARE v_language_progress JSONB;

v_topic_progress JSONB;

v_current_streak INTEGER;

v_longest_streak INTEGER;

v_avg_score NUMERIC;

v_improvement_rate NUMERIC;

BEGIN
	-- Initialize or get existing progress
	INSERT INTO "PracticeProgress" (email)
	VALUES (NEW.email) ON CONFLICT(email) DO NOTHING;

	-- Calculate language progress using subquery approach
	WITH lang_stats
	AS (
		SELECT pq.LANGUAGE
			,COUNT(*) AS attempted
			,COUNT(*) FILTER(WHERE ps."isPassed" = true) AS completed
			,AVG(ps.score) FILTER(WHERE ps."isPassed" = true) AS avg_score
		FROM "PracticeSubmissions" ps
		JOIN "PracticeQuestions" pq ON ps."practiceQuestionId" = pq.id
		WHERE ps.email = NEW.email
		GROUP BY pq.LANGUAGE
		)
	SELECT jsonb_object_agg(LANGUAGE, jsonb_build_object('attempted', attempted, 'completed', completed, 'avgScore', COALESCE(avg_score, 0)))
	INTO v_language_progress
	FROM lang_stats;

	-- Calculate topic progress using subquery approach
	WITH topic_stats
	AS (
		SELECT pq.topic
			,COUNT(*) AS attempted
			,COUNT(*) FILTER(WHERE ps."isPassed" = true) AS completed
			,AVG(ps.score) FILTER(WHERE ps."isPassed" = true) AS avg_score
		FROM "PracticeSubmissions" ps
		JOIN "PracticeQuestions" pq ON ps."practiceQuestionId" = pq.id
		WHERE ps.email = NEW.email
		GROUP BY pq.topic
		)
	SELECT jsonb_object_agg(topic, jsonb_build_object('attempted', attempted, 'completed', completed, 'avgScore', COALESCE(avg_score, 0)))
	INTO v_topic_progress
	FROM topic_stats;

	-- Calculate average score
	SELECT COALESCE(AVG(score), 0)
	INTO v_avg_score
	FROM "PracticeSubmissions"
	WHERE email = NEW.email
		AND "isPassed" = true;

	-- Calculate streaks (simplified approach)
	WITH practice_dates
	AS (
		SELECT DISTINCT DATE ("submittedAt") AS pdate
		FROM "PracticeSubmissions"
		WHERE email = NEW.email
		ORDER BY pdate DESC
		)
		,date_diffs
	AS (
		SELECT pdate
			,LAG(pdate) OVER (
				ORDER BY pdate DESC
				) AS prev_date
			,CASE 
				WHEN LAG(pdate) OVER (
						ORDER BY pdate DESC
						) - pdate = 1
					THEN 1
				ELSE 0
				END AS is_consecutive
		FROM practice_dates
		)
		,streak_calc
	AS (
		SELECT pdate
			,SUM(CASE 
					WHEN is_consecutive = 0
						THEN 1
					ELSE 0
					END) OVER (
				ORDER BY pdate DESC
				) AS streak_group
		FROM date_diffs
		)
		,streaks
	AS (
		SELECT COUNT(*) AS streak_length
			,MAX(pdate) AS streak_end
		FROM streak_calc
		GROUP BY streak_group
		)
	SELECT COALESCE(MAX(streak_length) FILTER(WHERE streak_end >= CURRENT_DATE - 1), 0)
		,COALESCE(MAX(streak_length), 0)
	INTO v_current_streak
		,v_longest_streak
	FROM streaks;

	-- Calculate improvement rate (first half vs second half)
	WITH ordered_subs
	AS (
		SELECT score
			,ROW_NUMBER() OVER (
				ORDER BY "submittedAt"
				) AS rn
			,COUNT(*) OVER () AS total
		FROM "PracticeSubmissions"
		WHERE email = NEW.email
			AND "isPassed" = true
		)
	SELECT COALESCE((
				SELECT AVG(score)
				FROM ordered_subs
				WHERE rn > total / 2
				) - (
				SELECT AVG(score)
				FROM ordered_subs
				WHERE rn <= total / 2
				), 0)
	INTO v_improvement_rate;

	-- Update progress record
	UPDATE "PracticeProgress"
	SET "questionsAttempted" = (
			SELECT COUNT(DISTINCT "practiceQuestionId")
			FROM "PracticeSubmissions"
			WHERE email = NEW.email
			)
		,"questionsCompleted" = (
			SELECT COUNT(DISTINCT "practiceQuestionId")
			FROM "PracticeSubmissions"
			WHERE email = NEW.email
				AND "isPassed" = true
			)
		,"totalPracticeQuestions" = (
			SELECT COUNT(*)
			FROM "PracticeQuestions"
			WHERE "generatedFor" = NEW.email
				AND "isActive" = true
			)
		,"languageProgress" = COALESCE(v_language_progress, '{}'::jsonb)
		,"topicProgress" = COALESCE(v_topic_progress, '{}'::jsonb)
		,"currentStreak" = v_current_streak
		,"longestStreak" = GREATEST(v_longest_streak, COALESCE("longestStreak", 0))
		,"lastPracticeDate" = DATE (NEW."submittedAt")
		,"averageScore" = v_avg_score
		,"improvementRate" = v_improvement_rate
		,"updatedAt" = CURRENT_TIMESTAMP
	WHERE email = NEW.email;

	RETURN NEW;
END;$FUNCTION$;

-- DROP FUNCTION public.update_updated_at_column();
CREATE
	OR REPLACE FUNCTION PUBLIC.update_updated_at_column ()
RETURNS TRIGGER LANGUAGE plpgsql AS $FUNCTION$

BEGIN
	NEW."updatedAt" = CURRENT_TIMESTAMP;

	RETURN NEW;
END;$FUNCTION$;
