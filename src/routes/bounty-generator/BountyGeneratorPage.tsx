import { GeneratorPanel } from '../../components/generator/GeneratorPanel';
import { BOUNTY_SPEC } from '../../generators/specs';

export function BountyGeneratorPage() {
  return <GeneratorPanel specs={[BOUNTY_SPEC]} />;
}
