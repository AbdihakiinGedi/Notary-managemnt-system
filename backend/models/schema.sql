
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

ALTER SCHEMA public OWNER TO postgres;

COMMENT ON SCHEMA public IS '';

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';

CREATE TYPE public.asset_type AS ENUM (
    'land',
    'vehicle',
    'motorcycle',
    'share',
    'digital',
    'car',
    'business_share',
    'digital_asset'
);

ALTER TYPE public.asset_type OWNER TO postgres;

CREATE TYPE public.transfer_status AS ENUM (
    'initiated',
    'accepted',
    'notarized',
    'completed',
    'rejected',
    'failed',
    'completing',
    'officer_review'
);

ALTER TYPE public.transfer_status OWNER TO postgres;

CREATE FUNCTION public.prevent_modifications() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'Table is append-only. Modification not allowed.';
END;
$$;

ALTER FUNCTION public.prevent_modifications() OWNER TO postgres;

CREATE TABLE public.asset_certificates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transfer_id uuid,
    notary_id uuid,
    certificate_hash text NOT NULL,
    certificate_json jsonb NOT NULL,
    issued_at timestamp with time zone DEFAULT now(),
    property_id uuid,
    owner_id uuid,
    status text DEFAULT 'valid'::text,
    ownership_transfer_id uuid
);

ALTER TABLE public.asset_certificates OWNER TO postgres;

CREATE TABLE public.asset_locks (
    asset_id uuid NOT NULL,
    locked boolean DEFAULT false,
    locked_by uuid,
    transfer_id uuid,
    locked_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.asset_locks OWNER TO postgres;

CREATE TABLE public.asset_ownerships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    start_date timestamp with time zone DEFAULT now(),
    end_date timestamp with time zone,
    transfer_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    active boolean DEFAULT false
);

ALTER TABLE public.asset_ownerships OWNER TO postgres;


CREATE TABLE public.asset_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    from_user_id uuid NOT NULL,
    to_user_id uuid NOT NULL,
    price numeric(15,2) DEFAULT 0,
    notary_id uuid,
    status public.transfer_status DEFAULT 'initiated'::public.transfer_status,
    idempotency_key text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completion_attempted boolean DEFAULT false,
    completion_attempts integer DEFAULT 0,
    completed_at timestamp with time zone,
    notary_request_id uuid
);

ALTER TABLE public.asset_transfers OWNER TO postgres;

CREATE TABLE public.assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type public.asset_type NOT NULL,
    reference_id text NOT NULL,
    current_owner_id uuid,
    status text DEFAULT 'active'::text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT assets_current_owner_not_null CHECK ((current_owner_id IS NOT NULL))
);

ALTER TABLE public.assets OWNER TO postgres;

CREATE TABLE public.audit_dead_letter (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    action character varying(255),
    affected_property_id uuid,
    metadata jsonb,
    error_message text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.audit_dead_letter OWNER TO postgres;

CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    action character varying(255) NOT NULL,
    ip_address character varying(50),
    request_url text,
    method character varying(10),
    status_code integer,
    user_agent text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    previous_hash text,
    current_hash text,
    sequential_id bigint NOT NULL,
    affected_property_id text,
    metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.audit_logs OWNER TO postgres;

ALTER TABLE public.audit_logs ALTER COLUMN sequential_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.audit_logs_sequential_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.digital_signatures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agreement_id uuid,
    user_id uuid NOT NULL,
    role character varying(20) NOT NULL,
    signature_type character varying(50) NOT NULL,
    signature_image text NOT NULL,
    signature_hash character varying(64) NOT NULL,
    ip_address character varying(45) NOT NULL,
    signed_at timestamp with time zone DEFAULT now(),
    property_id uuid
);

ALTER TABLE public.digital_signatures OWNER TO postgres;

CREATE TABLE public.documents (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    property_id uuid,
    file_name character varying(255) NOT NULL,
    file_path text NOT NULL,
    uploaded_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    file_hash text
);

ALTER TABLE public.documents OWNER TO postgres;

CREATE TABLE public.event_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    actor_id uuid NOT NULL,
    asset_id uuid,
    role text NOT NULL,
    payload_json jsonb NOT NULL,
    previous_hash text,
    current_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.event_log OWNER TO postgres;

CREATE TABLE public.file_commits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_path text NOT NULL,
    file_hash text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.file_commits OWNER TO postgres;

CREATE TABLE public.global_anchors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    state_hash text NOT NULL,
    anchored_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    schema_version integer DEFAULT 1,
    system_version character varying(20) DEFAULT '1.1.0'::character varying,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.global_anchors OWNER TO postgres;

CREATE TABLE public.idempotency_ledger (
    request_hash text NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    executed_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.idempotency_ledger OWNER TO postgres;

CREATE TABLE public.notary_certificates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid,
    notary_id uuid,
    certificate_hash text NOT NULL,
    issued_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    certificate_json jsonb,
    schema_version integer DEFAULT 1,
    hash_algorithm character varying(20) DEFAULT 'SHA256'::character varying,
    status text DEFAULT 'valid'::text
);

ALTER TABLE public.notary_certificates OWNER TO postgres;

CREATE TABLE public.notary_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid,
    file_path text NOT NULL,
    file_name text NOT NULL,
    uploaded_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    locked boolean DEFAULT false,
    file_hash text
);

ALTER TABLE public.notary_documents OWNER TO postgres;

CREATE TABLE public.notary_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid,
    user_id uuid,
    status character varying(20) DEFAULT 'pending'::character varying,
    signed_at timestamp with time zone,
    signature_hash text,
    CONSTRAINT signed_at_check CHECK ((signed_at <= (now() + '00:00:01'::interval)))
);

ALTER TABLE public.notary_participants OWNER TO postgres;

CREATE TABLE public.notary_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    assigned_notary_id uuid
);

ALTER TABLE public.notary_requests OWNER TO postgres;

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id uuid,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    category character varying(50) DEFAULT 'system'::character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    dedup_hash character varying(64)
);

ALTER TABLE public.notifications OWNER TO postgres;

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;

CREATE TABLE public.ownership_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid,
    from_user uuid,
    to_user uuid,
    notary_request_id uuid,
    status character varying(20) DEFAULT 'initiated'::character varying,
    price numeric(15,2),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    certificate_hash text
);

ALTER TABLE public.ownership_transfers OWNER TO postgres;

CREATE TABLE public.properties (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    district character varying(100) NOT NULL,
    address text NOT NULL,
    owner_id uuid NOT NULL,
    status character varying(50) DEFAULT 'registered'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    type character varying DEFAULT 'residential'::character varying,
    image_url text,
    latitude numeric,
    longitude numeric,
    metadata jsonb DEFAULT '{}'::jsonb,
    visibility character varying(20) DEFAULT 'public'::character varying
);

ALTER TABLE public.properties OWNER TO postgres;

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL
);

ALTER TABLE public.roles OWNER TO postgres;

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;

CREATE TABLE public.system_snapshot_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_count integer NOT NULL,
    ownership_count integer NOT NULL,
    active_transfers_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    previous_hash text,
    snapshot_hash text
);

ALTER TABLE public.system_snapshot_log OWNER TO postgres;

CREATE TABLE public.transfer_agreements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transfer_id uuid NOT NULL,
    agreement_number character varying(50) NOT NULL,
    pdf_path text,
    agreement_hash character varying(64),
    seller_signed boolean DEFAULT false,
    buyer_signed boolean DEFAULT false,
    notary_signed boolean DEFAULT false,
    officer_signed boolean DEFAULT false,
    locked boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.transfer_agreements OWNER TO postgres;

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    full_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role_id integer NOT NULL,
    phone character varying(50),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status text DEFAULT 'active'::text,
    national_id character varying(50),
    profile_photo character varying(255),
    id_document_url text,
    verification_status character varying(20) DEFAULT 'pending'::character varying,
    verification_type character varying(50),
    verification_number character varying(50),
    verification_document text,
    account_status character varying(20) DEFAULT 'pending'::character varying,
    verified boolean DEFAULT false,
    approved_by uuid,
    approved_at timestamp with time zone,
    rejection_reason text
);

ALTER TABLE public.users OWNER TO postgres;

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);

ALTER TABLE ONLY public.asset_certificates
    ADD CONSTRAINT asset_certificates_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.asset_certificates
    ADD CONSTRAINT asset_certificates_transfer_id_key UNIQUE (transfer_id);

ALTER TABLE ONLY public.asset_locks
    ADD CONSTRAINT asset_locks_pkey PRIMARY KEY (asset_id);

ALTER TABLE ONLY public.asset_ownerships
    ADD CONSTRAINT asset_ownerships_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.asset_transfers
    ADD CONSTRAINT asset_transfers_idempotency_key_key UNIQUE (idempotency_key);

ALTER TABLE ONLY public.asset_transfers
    ADD CONSTRAINT asset_transfers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_reference_id_key UNIQUE (reference_id);

ALTER TABLE ONLY public.audit_dead_letter
    ADD CONSTRAINT audit_dead_letter_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.digital_signatures
    ADD CONSTRAINT digital_signatures_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.event_log
    ADD CONSTRAINT event_log_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.file_commits
    ADD CONSTRAINT file_commits_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.global_anchors
    ADD CONSTRAINT global_anchors_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.idempotency_ledger
    ADD CONSTRAINT idempotency_ledger_pkey PRIMARY KEY (request_hash);

ALTER TABLE ONLY public.notary_certificates
    ADD CONSTRAINT notary_certificates_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notary_certificates
    ADD CONSTRAINT notary_certificates_request_id_key UNIQUE (request_id);

ALTER TABLE ONLY public.notary_documents
    ADD CONSTRAINT notary_documents_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notary_participants
    ADD CONSTRAINT notary_participants_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notary_participants
    ADD CONSTRAINT notary_participants_request_id_user_id_key UNIQUE (request_id, user_id);

ALTER TABLE ONLY public.notary_requests
    ADD CONSTRAINT notary_requests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_dedup_hash_key UNIQUE (dedup_hash);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ownership_transfers
    ADD CONSTRAINT ownership_transfers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.system_snapshot_log
    ADD CONSTRAINT system_snapshot_log_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.transfer_agreements
    ADD CONSTRAINT transfer_agreements_agreement_number_key UNIQUE (agreement_number);

ALTER TABLE ONLY public.transfer_agreements
    ADD CONSTRAINT transfer_agreements_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT unique_email UNIQUE (email);

ALTER TABLE ONLY public.notary_documents
    ADD CONSTRAINT unique_file_hash UNIQUE (file_hash);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

CREATE INDEX idx_asset_ownerships_active ON public.asset_ownerships USING btree (asset_id) WHERE (end_date IS NULL);

CREATE INDEX idx_asset_transfers_active ON public.asset_transfers USING btree (asset_id) WHERE (status <> ALL (ARRAY['completed'::public.transfer_status, 'rejected'::public.transfer_status]));

CREATE INDEX idx_assets_type_ref ON public.assets USING btree (type, reference_id);

CREATE INDEX idx_file_commits_status ON public.file_commits USING btree (status);

CREATE INDEX idx_notifications_user_cat ON public.notifications USING btree (user_id, category);

CREATE UNIQUE INDEX idx_one_active_owner ON public.asset_ownerships USING btree (asset_id) WHERE (active = true);

CREATE UNIQUE INDEX idx_one_active_owner_per_asset ON public.asset_ownerships USING btree (asset_id) WHERE (active = true);

CREATE UNIQUE INDEX idx_unique_agreement_transfer ON public.transfer_agreements USING btree (transfer_id);

CREATE UNIQUE INDEX idx_unique_sig_agreement_role ON public.digital_signatures USING btree (agreement_id, role);

CREATE UNIQUE INDEX ux_one_active_transfer_per_property ON public.ownership_transfers USING btree (property_id) WHERE ((status)::text = ANY ((ARRAY['initiated'::character varying, 'accepted'::character varying, 'pending_notary'::character varying, 'pending_officer'::character varying])::text[]));

CREATE UNIQUE INDEX ux_one_valid_certificate_per_property ON public.asset_certificates USING btree (property_id) WHERE (status = 'valid'::text);

CREATE TRIGGER tr_prevent_mods BEFORE DELETE OR UPDATE ON public.event_log FOR EACH ROW EXECUTE FUNCTION public.prevent_modifications();

ALTER TABLE ONLY public.asset_certificates
    ADD CONSTRAINT asset_certificates_notary_id_fkey FOREIGN KEY (notary_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.asset_certificates
    ADD CONSTRAINT asset_certificates_ownership_transfer_id_fkey FOREIGN KEY (ownership_transfer_id) REFERENCES public.ownership_transfers(id);

ALTER TABLE ONLY public.asset_certificates
    ADD CONSTRAINT asset_certificates_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES public.asset_transfers(id);

ALTER TABLE ONLY public.asset_locks
    ADD CONSTRAINT asset_locks_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id);

ALTER TABLE ONLY public.asset_locks
    ADD CONSTRAINT asset_locks_locked_by_fkey FOREIGN KEY (locked_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.asset_locks
    ADD CONSTRAINT asset_locks_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES public.asset_transfers(id);

ALTER TABLE ONLY public.asset_ownerships
    ADD CONSTRAINT asset_ownerships_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id);

ALTER TABLE ONLY public.asset_ownerships
    ADD CONSTRAINT asset_ownerships_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.asset_transfers
    ADD CONSTRAINT asset_transfers_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id);

ALTER TABLE ONLY public.asset_transfers
    ADD CONSTRAINT asset_transfers_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.asset_transfers
    ADD CONSTRAINT asset_transfers_notary_id_fkey FOREIGN KEY (notary_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.asset_transfers
    ADD CONSTRAINT asset_transfers_notary_request_id_fkey FOREIGN KEY (notary_request_id) REFERENCES public.notary_requests(id);

ALTER TABLE ONLY public.asset_transfers
    ADD CONSTRAINT asset_transfers_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_current_owner_id_fkey FOREIGN KEY (current_owner_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.digital_signatures
    ADD CONSTRAINT digital_signatures_agreement_id_fkey FOREIGN KEY (agreement_id) REFERENCES public.transfer_agreements(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.digital_signatures
    ADD CONSTRAINT digital_signatures_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);

ALTER TABLE ONLY public.digital_signatures
    ADD CONSTRAINT digital_signatures_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.notary_certificates
    ADD CONSTRAINT notary_certificates_notary_id_fkey FOREIGN KEY (notary_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.notary_certificates
    ADD CONSTRAINT notary_certificates_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.notary_requests(id);

ALTER TABLE ONLY public.notary_documents
    ADD CONSTRAINT notary_documents_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.notary_requests(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notary_participants
    ADD CONSTRAINT notary_participants_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.notary_requests(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notary_participants
    ADD CONSTRAINT notary_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.notary_requests
    ADD CONSTRAINT notary_requests_assigned_notary_id_fkey FOREIGN KEY (assigned_notary_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.ownership_transfers
    ADD CONSTRAINT ownership_transfers_from_user_fkey FOREIGN KEY (from_user) REFERENCES public.users(id);

ALTER TABLE ONLY public.ownership_transfers
    ADD CONSTRAINT ownership_transfers_notary_request_id_fkey FOREIGN KEY (notary_request_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.ownership_transfers
    ADD CONSTRAINT ownership_transfers_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);

ALTER TABLE ONLY public.ownership_transfers
    ADD CONSTRAINT ownership_transfers_to_user_fkey FOREIGN KEY (to_user) REFERENCES public.users(id);

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.transfer_agreements
    ADD CONSTRAINT transfer_agreements_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES public.ownership_transfers(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);

REVOKE USAGE ON SCHEMA public FROM PUBLIC;

INSERT INTO roles (name) VALUES 
('citizen'), 
('officer'), 
('notary'), 
('admin')
ON CONFLICT DO NOTHING;
