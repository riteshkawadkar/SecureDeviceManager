export interface Policy {
  id: string;
  name: string;
  policyJson: string;
  isEnabled: boolean;
  category: string;
  severity: string;
  createdOn: string;
}

export interface CreatePolicyRequest {
  name: string;
  policyJson: string;
  isEnabled: boolean;
  category: string;
  severity: string;
}

export interface UpdatePolicyRequest {
  name: string;
  policyJson: string;
  category: string;
  severity: string;
}
