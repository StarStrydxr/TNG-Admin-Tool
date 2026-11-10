import { GeneratorPanel } from '../../components/generator/GeneratorPanel';
import { MISSION_SPEC } from '../../generators/specs';

export function MissionGeneratorPage() {
  return <GeneratorPanel specs={[MISSION_SPEC]} />;
}
