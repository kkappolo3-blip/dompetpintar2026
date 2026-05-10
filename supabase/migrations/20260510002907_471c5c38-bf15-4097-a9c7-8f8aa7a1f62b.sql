
CREATE TABLE public.payment_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'active',
  total_budget numeric DEFAULT 0,
  planned_for date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own payment_plans" ON public.payment_plans
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.payment_plan_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid NOT NULL REFERENCES public.payment_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  qty numeric NOT NULL DEFAULT 1,
  unit text,
  est_price numeric NOT NULL DEFAULT 0,
  actual_price numeric,
  status text NOT NULL DEFAULT 'pending',
  note text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own payment_plan_items" ON public.payment_plan_items
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_plan_items_plan ON public.payment_plan_items(plan_id);
