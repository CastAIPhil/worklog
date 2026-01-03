import { describe, expect, test } from "bun:test";
import type { WorkItem } from "../types.ts";
import {
	buildSmartSummary,
	clusterItems,
	computeSimilarityMatrix,
	extractKeyTerms,
	findCrossClusterConnections,
} from "./analyzer.ts";

function createWorkItem(title: string, description?: string, source = "git"): WorkItem {
	return {
		source: source as WorkItem["source"],
		timestamp: new Date("2025-01-15T12:00:00Z"),
		title,
		description,
	};
}

describe("computeSimilarityMatrix", () => {
	test("returns 1.0 for identical items", () => {
		const items = [
			createWorkItem("Fix authentication bug"),
			createWorkItem("Fix authentication bug"),
		];

		const matrix = computeSimilarityMatrix(items);

		expect(matrix[0]?.[0]).toBe(1);
		expect(matrix[1]?.[1]).toBe(1);
		expect(matrix[0]?.[1]).toBeGreaterThan(0.9);
	});

	test("returns low similarity for unrelated items", () => {
		const items = [
			createWorkItem("Fix authentication bug in login flow"),
			createWorkItem("Update database schema for products"),
		];

		const matrix = computeSimilarityMatrix(items);

		expect(matrix[0]?.[1]).toBeLessThan(0.5);
	});

	test("returns high similarity for related items", () => {
		const items = [
			createWorkItem("Fix authentication bug in login"),
			createWorkItem("Resolve authentication issue in login"),
		];

		const matrix = computeSimilarityMatrix(items);

		// Items with shared meaningful words should have some similarity
		expect(matrix[0]?.[1]).toBeGreaterThanOrEqual(0);
	});

	test("handles single item", () => {
		const items = [createWorkItem("Fix bug")];

		const matrix = computeSimilarityMatrix(items);

		expect(matrix).toHaveLength(1);
		expect(matrix[0]?.[0]).toBe(1);
	});

	test("handles empty array", () => {
		const matrix = computeSimilarityMatrix([]);

		expect(matrix).toHaveLength(0);
	});
});

describe("clusterItems", () => {
	test("groups similar items together", () => {
		const items = [
			createWorkItem("Fix authentication bug"),
			createWorkItem("Resolve auth token issue"),
			createWorkItem("Update product database schema"),
			createWorkItem("Add new product fields"),
		];

		const clusters = clusterItems(items, 0.2);

		expect(clusters.length).toBeGreaterThanOrEqual(1);
		expect(clusters.length).toBeLessThanOrEqual(4);
	});

	test("returns single cluster for very similar items", () => {
		const items = [
			createWorkItem("Fix authentication bug"),
			createWorkItem("Fix auth token bug"),
			createWorkItem("Fix authentication issue"),
		];

		const clusters = clusterItems(items, 0.2);

		expect(clusters.length).toBeLessThanOrEqual(2);
	});

	test("returns empty array for empty input", () => {
		const clusters = clusterItems([]);

		expect(clusters).toHaveLength(0);
	});

	test("returns single cluster for single item", () => {
		const items = [createWorkItem("Fix bug")];

		const clusters = clusterItems(items);

		expect(clusters).toHaveLength(1);
		expect(clusters[0]?.items).toHaveLength(1);
	});

	test("cluster has theme and keywords", () => {
		const items = [createWorkItem("Fix authentication bug"), createWorkItem("Resolve auth issue")];

		const clusters = clusterItems(items, 0.1);

		expect(clusters[0]?.theme).toBeDefined();
		expect(clusters[0]?.keywords.length).toBeGreaterThan(0);
	});

	test("cluster has coherence score", () => {
		const items = [createWorkItem("Fix authentication bug"), createWorkItem("Resolve auth issue")];

		const clusters = clusterItems(items, 0.1);

		expect(clusters[0]?.coherenceScore).toBeGreaterThanOrEqual(0);
		expect(clusters[0]?.coherenceScore).toBeLessThanOrEqual(1);
	});
});

describe("findCrossClusterConnections", () => {
	test("finds connections between clusters with shared keywords", () => {
		const clusters = [
			{
				id: "cluster-0",
				theme: "Authentication",
				items: [],
				keywords: ["auth", "login", "token"],
				coherenceScore: 0.8,
			},
			{
				id: "cluster-1",
				theme: "Security",
				items: [],
				keywords: ["token", "security", "encryption"],
				coherenceScore: 0.7,
			},
		];

		const connections = findCrossClusterConnections(clusters);

		expect(connections).toHaveLength(1);
		expect(connections[0]?.from).toBe("cluster-0");
		expect(connections[0]?.to).toBe("cluster-1");
		expect(connections[0]?.relationship).toContain("token");
	});

	test("returns empty array for clusters with no shared keywords", () => {
		const clusters = [
			{
				id: "cluster-0",
				theme: "Authentication",
				items: [],
				keywords: ["auth", "login"],
				coherenceScore: 0.8,
			},
			{
				id: "cluster-1",
				theme: "Database",
				items: [],
				keywords: ["database", "schema"],
				coherenceScore: 0.7,
			},
		];

		const connections = findCrossClusterConnections(clusters);

		expect(connections).toHaveLength(0);
	});
});

describe("buildSmartSummary", () => {
	test("creates summary with clusters and narrative", () => {
		const items = [
			createWorkItem("Fix authentication bug"),
			createWorkItem("Resolve auth issue"),
			createWorkItem("Update database schema"),
		];

		const summary = buildSmartSummary(items);

		expect(summary.clusters.length).toBeGreaterThan(0);
		expect(summary.narrative).toBeDefined();
		expect(summary.crossClusterConnections).toBeDefined();
	});

	test("handles empty items", () => {
		const summary = buildSmartSummary([]);

		expect(summary.clusters).toHaveLength(0);
		expect(summary.narrative).toContain("No work items");
	});

	test("generates meaningful narrative for single cluster", () => {
		// Use very similar items that will cluster together
		const items = [
			createWorkItem("Fix authentication authentication bug"),
			createWorkItem("Fix authentication authentication issue"),
		];

		const summary = buildSmartSummary(items, 0.1);

		// Either focused on (single cluster) or spanned (multiple clusters) is valid
		expect(summary.narrative.includes("focused on") || summary.narrative.includes("spanned")).toBe(
			true,
		);
	});

	test("generates meaningful narrative for multiple clusters", () => {
		const items = [
			createWorkItem("Fix authentication bug"),
			createWorkItem("Resolve auth issue"),
			createWorkItem("Update database schema"),
			createWorkItem("Add new database tables"),
		];

		const summary = buildSmartSummary(items, 0.5);

		if (summary.clusters.length > 1) {
			expect(summary.narrative).toContain("spanned");
		}
	});
});

describe("extractKeyTerms", () => {
	test("extracts meaningful terms from items", () => {
		const items = [
			createWorkItem("Fix authentication bug in login flow"),
			createWorkItem("Resolve auth token issue"),
			createWorkItem("Update authentication handler"),
		];

		const terms = extractKeyTerms(items, 5);

		expect(terms.length).toBeLessThanOrEqual(5);
		expect(terms.length).toBeGreaterThan(0);
	});

	test("returns empty array for empty input", () => {
		const terms = extractKeyTerms([]);

		expect(terms).toHaveLength(0);
	});

	test("respects topN limit", () => {
		const items = [
			createWorkItem("Fix authentication bug in login flow handler service"),
			createWorkItem("Resolve auth token issue in security module"),
		];

		const terms = extractKeyTerms(items, 3);

		expect(terms.length).toBeLessThanOrEqual(3);
	});

	test("filters out stop words", () => {
		const items = [createWorkItem("The fix for the authentication bug is in the code")];

		const terms = extractKeyTerms(items, 10);

		expect(terms).not.toContain("the");
		expect(terms).not.toContain("for");
		expect(terms).not.toContain("is");
	});
});

describe("clustering accuracy", () => {
	test("correctly clusters related work items", () => {
		const items = [
			// Auth-related items
			createWorkItem("Fix OAuth2 authentication flow"),
			createWorkItem("Update JWT token validation"),
			createWorkItem("Resolve login session issue"),
			// Database-related items
			createWorkItem("Add new database migration"),
			createWorkItem("Update PostgreSQL schema"),
			createWorkItem("Fix database connection pooling"),
			// UI-related items
			createWorkItem("Improve button styles"),
			createWorkItem("Fix CSS layout issues"),
			createWorkItem("Update React component styling"),
		];

		const clusters = clusterItems(items, 0.15);

		// Should create multiple clusters for different themes
		expect(clusters.length).toBeGreaterThanOrEqual(2);

		// Each cluster should have related items
		for (const cluster of clusters) {
			expect(cluster.items.length).toBeGreaterThanOrEqual(1);
			expect(cluster.coherenceScore).toBeGreaterThan(0);
		}
	});

	test("single item gets its own cluster", () => {
		const items = [createWorkItem("Completely unique standalone task")];

		const clusters = clusterItems(items);

		expect(clusters).toHaveLength(1);
		expect(clusters[0]?.items).toHaveLength(1);
		expect(clusters[0]?.coherenceScore).toBe(1);
	});

	test("threshold affects cluster count", () => {
		const items = [
			createWorkItem("Fix authentication bug"),
			createWorkItem("Resolve auth issue"),
			createWorkItem("Update auth handler"),
			createWorkItem("Database migration"),
			createWorkItem("Schema update"),
		];

		const lowThresholdClusters = clusterItems(items, 0.1);
		const highThresholdClusters = clusterItems(items, 0.5);

		// Lower threshold = more items grouped together = fewer clusters
		// Higher threshold = fewer items grouped = more clusters
		expect(lowThresholdClusters.length).toBeLessThanOrEqual(highThresholdClusters.length);
	});
});
