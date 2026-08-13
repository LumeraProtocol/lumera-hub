import * as instance from '@/utils/api';
import type { IValidator } from '@/types/validator';

export const BONDED_VALIDATORS_PATH =
  '/cosmos/staking/v1beta1/validators?pagination.limit=1000&status=BOND_STATUS_BONDED&pagination.count_total=true';

interface BondedValidatorsResponse {
  validators: IValidator[];
  pagination: {
    total: string;
  };
}

type ValidatorRequest = (path: string) => Promise<{
  data: BondedValidatorsResponse;
}>;

// Validator metadata is public chain data and must not depend on the connected wallet type.
export const fetchBondedValidators = async (
  request: ValidatorRequest = instance.get
) => {
  const { data } = await request(BONDED_VALIDATORS_PATH);
  return data;
};
