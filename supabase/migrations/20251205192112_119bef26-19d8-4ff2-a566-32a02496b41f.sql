-- Add vehicle_id column to usuarios table for vehicle of interest
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS vehicle_id text;

-- Add comment for documentation
COMMENT ON COLUMN public.usuarios.vehicle_id IS 'Vehicle of interest - references v_estoque_disponivel.vehicle_id';

-- Enable RLS on usuarios table
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations on usuarios" 
ON public.usuarios 
FOR ALL 
USING (true) 
WITH CHECK (true);