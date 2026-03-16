export interface TestAccount {
  id: string;
  name: string;
}

export const TEST_ACCOUNTS: TestAccount[] = [
  { id: "owner", name: "테스트 등록자" },
  { id: "reviewer", name: "테스트 리뷰어" },
  { id: "reporter", name: "테스트 신고자" },
];

export function findTestAccountById(accountId: string) {
  return TEST_ACCOUNTS.find((account) => account.id === accountId) ?? null;
}
