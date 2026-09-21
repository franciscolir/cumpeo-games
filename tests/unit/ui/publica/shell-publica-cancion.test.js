import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('shell-publica Cancion Incompleta integration', () => {
  it('shell-publica contiene _renderEscenarioCancionIncompleta', () => {
    const filePath = join(process.cwd(), 'src/ui/publica/shell-publica.js');
    const content = readFileSync(filePath, 'utf8');
    expect(content).toContain('_renderEscenarioCancionIncompleta');
    expect(content).toContain("esCancionIncompleta = juegoActivo?.juego_codigo === 'CANCION_INCOMPLETA'");
    expect(content).toContain('Canción Incompleta');
  });
});
