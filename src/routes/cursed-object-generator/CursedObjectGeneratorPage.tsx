import { GeneratorPanel } from '../../components/generator/GeneratorPanel';
import { CURSED_OBJECT_SPEC } from '../../generators/specs';

export function CursedObjectGeneratorPage() {
  return <GeneratorPanel specs={[CURSED_OBJECT_SPEC]} />;
}
