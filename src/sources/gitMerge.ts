export function isPullRequestMergeSubject(subject: string): boolean {
	return /^Merge\s+pull\s+request\s+#\d+/i.test(subject.trim());
}

export type BranchMergeInfo = {
	sourceBranch: string;
	targetBranch?: string;
};

function normalizeBranchName(name: string): string {
	return name.trim().replace(/^refs\//, "");
}

export function extractBranchMergeInfo(subject: string): BranchMergeInfo | null {
	const trimmed = subject.trim();

	const remoteTrackingMatch = trimmed.match(
		/^Merge\s+remote-tracking\s+branch\s+['"]([^'"]+)['"](?:\s+into\s+(.+))?$/i,
	);
	if (remoteTrackingMatch?.[1]) {
		const sourceBranch = normalizeBranchName(remoteTrackingMatch[1]);
		const targetBranch = remoteTrackingMatch[2]
			? normalizeBranchName(remoteTrackingMatch[2])
			: undefined;
		return { sourceBranch, targetBranch };
	}

	const branchIntoMatch = trimmed.match(/^Merge\s+branch\s+['"]([^'"]+)['"](?:\s+into\s+(.+))?$/i);
	if (branchIntoMatch?.[1]) {
		const sourceBranch = normalizeBranchName(branchIntoMatch[1]);
		const targetBranch = branchIntoMatch[2] ? normalizeBranchName(branchIntoMatch[2]) : undefined;
		return { sourceBranch, targetBranch };
	}

	return null;
}

export function isMergeCommit(parents: string[]): boolean {
	return parents.length >= 2;
}

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

export function matchesGitIdentity(
	commit: { authorEmail: string; committerEmail: string },
	identityEmails: string[],
): boolean {
	const emails = identityEmails.map(normalizeEmail).filter(Boolean);
	if (emails.length === 0) return false;

	const author = normalizeEmail(commit.authorEmail);
	const committer = normalizeEmail(commit.committerEmail);

	return emails.includes(author) || emails.includes(committer);
}
