/** The rows the app reads, as Supabase returns them. */
export type Role = 'admin' | 'super_admin' | 'manager' | 'sales' | 'distributor' | 'beneficiary' | 'logger';

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  occupation: string | null;
  date_of_birth: string | null;
  role: Role;
  status: 'pending' | 'active' | 'inactive';
  next_period_date: string | null;
  beneficiary_code: string | null;
  created_at: string;
};

export type Person = Pick<Profile, 'id' | 'full_name' | 'role' | 'email'>;

export type CycleLog = {
  id: string;
  beneficiary_id: string;
  start_date: string;
  end_date: string | null;
  flow_intensity: string | null;
  mood: string | null;
  feelings: string | null;
  notes: string | null;
  status: string;
};

export type Distribution = {
  id: string;
  beneficiary_id: string;
  distributor_id: string | null;
  distribution_date: string;
  num_pads: number;
  transport_mode: string;
  delivery_address: string | null;
  delivery_cost: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  beneficiary?: { full_name: string } | null;
  distributor?: { full_name: string } | null;
};

export type Expense = {
  id: string;
  category: string;
  amount_given: number;
  amount_spent: number;
  remaining_balance: number;
  date_of_allocation: string;
  date_of_expenditure: string | null;
  notes: string | null;
  created_at: string;
  recorded_by_profile?: { full_name: string } | null;
};

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type MessageGroup = { id: string; name: string; created_by: string };

export type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  profiles?: { full_name: string } | null;
};

export type StoryMedia = {
  id: string;
  link: string;
  type: 'image' | 'video';
  processed_url: string | null;
  storage_path: string | null;
  provider: string | null;
};

export type StoryMember = { id: string; fullname: string };

export type Story = {
  id: string;
  title: string;
  location: string | null;
  story_text: string;
  category: string | null;
  is_published: boolean;
  created_at: string;
  story_media: StoryMedia[];
  story_members: StoryMember[];
};

export type FounderStory = {
  id: string;
  title: string;
  description: string;
  founder_name: string;
  founder_date: string | null;
  image_url: string | null;
  storage_path: string | null;
};
