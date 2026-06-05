-- Mejores políticas de seguridad para organizations
-- Solo permitir que los usuarios creen organizaciones cuando no tienen ninguna
CREATE OR REPLACE POLICY "Allow organization creation for new users" ON organizations
FOR INSERT WITH CHECK (
  -- Permitir inserción solo si el usuario no tiene organizaciones existentes
  NOT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = auth.uid() 
    AND organization_id IN (SELECT id FROM organizations)
  )
);

-- Permitir actualizaciones solo de organizaciones propias
CREATE OR REPLACE POLICY "Allow organization updates for owners" ON organizations
FOR UPDATE USING (
  -- Permitir actualización si el usuario es dueño de la organización
  EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = auth.uid() 
    AND organization_id = organizations.id
    AND role = 'OWNER'
  )
);

-- Permitir lecturas de organizaciones
CREATE OR REPLACE POLICY "Allow organization read access" ON organizations
FOR SELECT USING (true);

-- Mejores políticas para organization_members
-- Permitir inserción de membresías solo para usuarios autenticados
CREATE OR REPLACE POLICY "Allow organization membership creation" ON organization_members
FOR INSERT WITH CHECK (auth.uid() is not null);

-- Permitir actualizaciones de membresías solo para usuarios autenticados
CREATE OR REPLACE POLICY "Allow organization membership updates" ON organization_members
FOR UPDATE USING (auth.uid() is not null);

-- Permitir lecturas de membresías
CREATE OR REPLACE POLICY "Allow organization membership read access" ON organization_members
FOR SELECT USING (true);