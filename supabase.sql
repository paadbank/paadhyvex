-- CLEANUP (safe to run multiple times)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_distributions_updated_at ON distributions;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS role_change_log CASCADE;
DROP TABLE IF EXISTS message_group_members CASCADE;
DROP TABLE IF EXISTS message_groups CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS expense_records CASCADE;
DROP TABLE IF EXISTS distributions CASCADE;
DROP TABLE IF EXISTS cycle_logs CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS distribution_status CASCADE;
DROP TYPE IF EXISTS transport_mode CASCADE;
DROP TYPE IF EXISTS expense_category CASCADE;
DROP TYPE IF EXISTS flow_intensity CASCADE;
DROP TYPE IF EXISTS cycle_status CASCADE;
DROP TYPE IF EXISTS notification_channel CASCADE;

-- ENUMS
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'sales', 'distributor', 'beneficiary');
CREATE TYPE user_status AS ENUM ('pending', 'active', 'inactive');
CREATE TYPE distribution_status AS ENUM ('pending', 'in_transit', 'completed', 'failed');
CREATE TYPE transport_mode AS ENUM ('pickup', 'dispatch');
CREATE TYPE expense_category AS ENUM ('purchases', 'distribution', 'salaries', 'others');
CREATE TYPE flow_intensity AS ENUM ('light', 'moderate', 'heavy');
CREATE TYPE cycle_status AS ENUM ('open', 'closed', 'requires_update');
CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'both');

-- PROFILES TABLE
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  occupation VARCHAR(255),
  date_of_birth DATE,
  location VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  profile_photo_url TEXT,
  role user_role DEFAULT 'beneficiary' NOT NULL,
  status user_status DEFAULT 'pending' NOT NULL,
  next_period_date DATE,
  pad_allocation_limit INTEGER DEFAULT 0,
  assigned_distributor_id UUID REFERENCES profiles(id),
  beneficiary_code VARCHAR(20) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CYCLE LOGS TABLE
CREATE TABLE cycle_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  duration_days INTEGER GENERATED ALWAYS AS (CASE WHEN end_date IS NOT NULL THEN (end_date - start_date) ELSE NULL END) STORED,
  flow_intensity flow_intensity,
  notes TEXT,
  feelings TEXT,
  mood VARCHAR(100),
  status cycle_status DEFAULT 'open' NOT NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DISTRIBUTIONS TABLE
CREATE TABLE distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  distributor_id UUID REFERENCES profiles(id),
  distribution_date DATE NOT NULL,
  num_pads INTEGER NOT NULL CHECK (num_pads > 0),
  pads_per_day DECIMAL(4,2),
  transport_mode transport_mode NOT NULL,
  delivery_address TEXT,
  delivery_cost DECIMAL(10,2) DEFAULT 0,
  status distribution_status DEFAULT 'pending' NOT NULL,
  pickup_reference_code VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EXPENSE RECORDS TABLE
CREATE TABLE expense_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category expense_category NOT NULL,
  amount_given DECIMAL(12,2) NOT NULL CHECK (amount_given >= 0),
  amount_spent DECIMAL(12,2) NOT NULL CHECK (amount_spent >= 0),
  remaining_balance DECIMAL(12,2) GENERATED ALWAYS AS (amount_given - amount_spent) STORED,
  date_of_allocation DATE NOT NULL,
  date_of_expenditure DATE,
  linked_distribution_id UUID REFERENCES distributions(id),
  recorded_by UUID NOT NULL REFERENCES profiles(id),
  document_url TEXT,
  notes TEXT,
  source VARCHAR(50) DEFAULT 'manual',
  is_confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS TABLE
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  channel notification_channel DEFAULT 'in_app' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MESSAGE GROUPS TABLE
CREATE TABLE message_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MESSAGES TABLE
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES message_groups(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  attachment_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  is_flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK ((recipient_id IS NOT NULL AND group_id IS NULL) OR (recipient_id IS NULL AND group_id IS NOT NULL))
);

-- MESSAGE GROUP MEMBERS TABLE
CREATE TABLE message_group_members (
  group_id UUID NOT NULL REFERENCES message_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- ROLE CHANGE LOG TABLE
CREATE TABLE role_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES profiles(id),
  old_role user_role NOT NULL,
  new_role user_role NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROFILE CODES TABLE
CREATE TABLE profile_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  used_by UUID REFERENCES profiles(id),
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUDIT LOG TABLE
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id),
  action VARCHAR(255) NOT NULL,
  target_table VARCHAR(100) NOT NULL,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_assigned_distributor ON profiles(assigned_distributor_id);
CREATE INDEX idx_cycle_logs_beneficiary ON cycle_logs(beneficiary_id);
CREATE INDEX idx_cycle_logs_status ON cycle_logs(status);
CREATE INDEX idx_cycle_logs_start_date ON cycle_logs(start_date);
CREATE INDEX idx_distributions_beneficiary ON distributions(beneficiary_id);
CREATE INDEX idx_distributions_distributor ON distributions(distributor_id);
CREATE INDEX idx_distributions_status ON distributions(status);
CREATE INDEX idx_distributions_date ON distributions(distribution_date);
CREATE INDEX idx_expense_records_category ON expense_records(category);
CREATE INDEX idx_expense_records_recorded_by ON expense_records(recorded_by);
CREATE INDEX idx_expense_records_linked_distribution ON expense_records(linked_distribution_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_group ON messages(group_id);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_target ON audit_log(target_table, target_id);
CREATE INDEX idx_profiles_beneficiary_code ON profiles(beneficiary_code);
CREATE INDEX idx_profile_codes_code ON profile_codes(code);

-- TRIGGER: Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name,
    phone,
    location,
    occupation,
    date_of_birth
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'location',
    NEW.raw_user_meta_data->>'occupation',
    (NEW.raw_user_meta_data->>'date_of_birth')::DATE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- TRIGGER: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_distributions_updated_at BEFORE UPDATE ON distributions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function to avoid circular references in RLS policies
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- PROFILES POLICIES
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "All users can view profiles" ON profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow beneficiary code lookup for login" ON profiles FOR SELECT USING (beneficiary_code IS NOT NULL);
CREATE POLICY "Admins can update profiles" ON profiles FOR UPDATE USING (
  public.get_user_role() IN ('admin', 'manager')
);
CREATE POLICY "Admin can delete profiles" ON profiles FOR DELETE USING (
  public.get_user_role() = 'admin'
);
CREATE POLICY "Logger can view all beneficiaries" ON profiles FOR SELECT USING (
  public.get_user_role() = 'logger' AND role = 'beneficiary'
);

-- CYCLE LOGS POLICIES
CREATE POLICY "Beneficiaries can manage own cycle logs" ON cycle_logs FOR ALL USING (beneficiary_id = auth.uid());
CREATE POLICY "Admins can view all cycle logs" ON cycle_logs FOR SELECT USING (
  public.get_user_role() IN ('admin', 'manager')
);
CREATE POLICY "Distributors can view assigned beneficiary logs" ON cycle_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = cycle_logs.beneficiary_id AND p.assigned_distributor_id = auth.uid())
);
CREATE POLICY "Logger can manage all cycle logs" ON cycle_logs FOR ALL USING (
  public.get_user_role() = 'logger'
);

-- DISTRIBUTIONS POLICIES
CREATE POLICY "Beneficiaries can view own distributions" ON distributions FOR SELECT USING (beneficiary_id = auth.uid());
CREATE POLICY "Distributors can manage assigned distributions" ON distributions FOR ALL USING (
  distributor_id = auth.uid() OR public.get_user_role() IN ('admin', 'manager')
);
CREATE POLICY "Admins can manage all distributions" ON distributions FOR ALL USING (
  public.get_user_role() IN ('admin', 'manager')
);
CREATE POLICY "Admin can delete distributions" ON distributions FOR DELETE USING (
  public.get_user_role() = 'admin'
);

-- EXPENSE RECORDS POLICIES
CREATE POLICY "Sales can manage expense records" ON expense_records FOR ALL USING (
  public.get_user_role() IN ('admin', 'manager', 'sales')
);
CREATE POLICY "Admin can delete expense records" ON expense_records FOR DELETE USING (
  public.get_user_role() = 'admin'
);

-- NOTIFICATIONS POLICIES
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (recipient_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (recipient_id = auth.uid());
CREATE POLICY "Admins can create notifications" ON notifications FOR INSERT WITH CHECK (
  public.get_user_role() IN ('admin', 'manager')
);

-- MESSAGES POLICIES
CREATE POLICY "Users can view their messages" ON messages FOR SELECT USING (
  sender_id = auth.uid() OR recipient_id = auth.uid() OR
  (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
);
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND (recipient_id IS NOT NULL OR
  (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid())))
);
CREATE POLICY "Users can update messages" ON messages FOR UPDATE USING (
  sender_id = auth.uid() OR recipient_id = auth.uid() OR
  (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
);

-- MESSAGE GROUPS POLICIES
CREATE POLICY "Users can create groups" ON message_groups FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can manage own groups" ON message_groups FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Users can delete own groups" ON message_groups FOR DELETE USING (created_by = auth.uid());
CREATE POLICY "Users can view their groups" ON message_groups FOR SELECT USING (
  created_by = auth.uid() OR public.is_group_member(id, auth.uid())
);

-- MESSAGE GROUP MEMBERS POLICIES
CREATE POLICY "Group creators can manage members" ON message_group_members FOR ALL USING (
  EXISTS (SELECT 1 FROM message_groups WHERE id = message_group_members.group_id AND created_by = auth.uid())
);
CREATE POLICY "Members can view group members" ON message_group_members FOR SELECT USING (
  public.is_group_member(group_id, auth.uid())
);

-- ROLE CHANGE LOG POLICIES
CREATE POLICY "Admins can view role changes" ON role_change_log FOR SELECT USING (
  public.get_user_role() IN ('admin', 'manager')
);

-- AUDIT LOG POLICIES
CREATE POLICY "Admins can view audit log" ON audit_log FOR SELECT USING (
  public.get_user_role() IN ('admin', 'manager')
);
CREATE POLICY "System can insert audit log" ON audit_log FOR INSERT WITH CHECK (true);

-- PROFILE CODES POLICIES
CREATE POLICY "Admins can manage profile codes" ON profile_codes FOR ALL USING (
  public.get_user_role() IN ('admin', 'manager')
);

-- STORIES TABLE
DROP TABLE IF EXISTS stories CASCADE;

CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  story_text TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_type VARCHAR(10) NOT NULL CHECK (media_type IN ('image', 'video')),
  category VARCHAR(100),
  is_published BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stories_is_published ON stories(is_published);
CREATE INDEX idx_stories_created_at ON stories(created_at);

CREATE TRIGGER update_stories_updated_at BEFORE UPDATE ON stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Public can read published stories (no auth required for landing page)
CREATE POLICY "Anyone can view published stories" ON stories
  FOR SELECT USING (is_published = true);

-- Authenticated users with admin/manager role can read all
CREATE POLICY "Admins can view all stories" ON stories
  FOR SELECT USING (public.get_user_role() IN ('admin', 'manager'));

-- Admins and managers can insert/update/delete
CREATE POLICY "Admins can manage stories" ON stories
  FOR ALL USING (public.get_user_role() IN ('admin', 'manager'));
