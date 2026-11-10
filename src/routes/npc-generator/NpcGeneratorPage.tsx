import { GeneratorPanel } from '../../components/generator/GeneratorPanel';
import { NPC_SPECS } from '../../generators/specs';

export function NpcGeneratorPage() {
  return <GeneratorPanel specs={NPC_SPECS} />;
}
