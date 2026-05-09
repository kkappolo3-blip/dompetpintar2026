
-- Add user_id columns
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS paid_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS user_id uuid;

-- Make device_id nullable so user-scoped rows don't need it
ALTER TABLE public.incomes ALTER COLUMN device_id DROP NOT NULL;
ALTER TABLE public.bills ALTER COLUMN device_id DROP NOT NULL;
ALTER TABLE public.debts ALTER COLUMN device_id DROP NOT NULL;
ALTER TABLE public.expenses ALTER COLUMN device_id DROP NOT NULL;
ALTER TABLE public.chat_messages ALTER COLUMN device_id DROP NOT NULL;

-- New receivables table (piutang)
CREATE TABLE IF NOT EXISTS public.receivables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  device_id text,
  debtor text NOT NULL,
  total_amount numeric NOT NULL,
  remaining numeric NOT NULL,
  priority integer DEFAULT 3,
  due_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;

-- Drop existing permissive policies
DROP POLICY IF EXISTS "open bills" ON public.bills;
DROP POLICY IF EXISTS "open incomes" ON public.incomes;
DROP POLICY IF EXISTS "open debts" ON public.debts;
DROP POLICY IF EXISTS "open expenses" ON public.expenses;
DROP POLICY IF EXISTS "open chat" ON public.chat_messages;

-- Strict user-scoped policies
CREATE POLICY "own bills" ON public.bills FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own incomes" ON public.incomes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own debts" ON public.debts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own expenses" ON public.expenses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own chat" ON public.chat_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own receivables" ON public.receivables FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Migration RPC: claim device_id rows to current user
CREATE OR REPLACE FUNCTION public.claim_device_data(_device_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR _device_id IS NULL OR _device_id = '' THEN RETURN; END IF;
  UPDATE public.incomes SET user_id = auth.uid() WHERE device_id = _device_id AND user_id IS NULL;
  UPDATE public.bills SET user_id = auth.uid() WHERE device_id = _device_id AND user_id IS NULL;
  UPDATE public.debts SET user_id = auth.uid() WHERE device_id = _device_id AND user_id IS NULL;
  UPDATE public.expenses SET user_id = auth.uid() WHERE device_id = _device_id AND user_id IS NULL;
  UPDATE public.chat_messages SET user_id = auth.uid() WHERE device_id = _device_id AND user_id IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_device_data(text) TO authenticated;
