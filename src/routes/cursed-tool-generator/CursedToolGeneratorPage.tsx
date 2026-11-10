import { GeneratorPanel } from '../../components/generator/GeneratorPanel';
import { CURSED_TOOL_SPEC } from '../../generators/specs';

export function CursedToolGeneratorPage() {
  return <GeneratorPanel specs={[CURSED_TOOL_SPEC]} />;
}
