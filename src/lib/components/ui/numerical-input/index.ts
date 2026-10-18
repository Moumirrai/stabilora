import Root, {
  type NumericalInputSize,
  type NumericalInputVariant,
  numericalInputVariants,
} from './numerical-input.svelte';
import Group, {
  numericalInputGroupVariants,
  type NumericalInputGroupOrientation,
} from './numerical-input-group.svelte';
import GroupLabel from './numerical-input-group-label.svelte';

export {
  Root,
  Group,
  GroupLabel,
  numericalInputVariants,
  numericalInputGroupVariants,
  type NumericalInputSize,
  type NumericalInputVariant,
  type NumericalInputGroupOrientation,
  //
  Root as NumericalInput,
  Group as NumericalInputGroup,
  GroupLabel as NumericalInputGroupLabel,
};
