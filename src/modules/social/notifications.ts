export async function notifyTokenExpired(input: {
  userId: string;
  accountLabel: string;
}) {
  console.info(`Token expired for ${input.accountLabel}; notify user ${input.userId}`);
}
