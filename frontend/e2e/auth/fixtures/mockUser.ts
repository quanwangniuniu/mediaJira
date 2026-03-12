import type { Page } from "@playwright/test";


export const mockUser = {
	id: 1,
	email: process.env.E2E_TEST_EMAIL ?? "test@example.com",
	password: process.env.E2E_TEST_PASSWORD ?? "Password123!",
	username: process.env.E2E_TEST_USERNAME ?? "testuser",
	token: process.env.E2E_TEST_TOKEN ?? "fake-jwt-token",
};


/** User object returned by login/me APIs; exported for OAuth auth_data fixture. */
export const mockLoginUser = {
	id: mockUser.id,
	email: mockUser.email,
	username: mockUser.username,
	is_verified: true,
	organization: null,
	roles: [] as string[],
	first_name: "",
	last_name: "",
};


export async function setupLoginMock(page: Page) {
	const loginResponse = {
		token: mockUser.token,
		refresh: "fake-refresh-token",
		user: mockLoginUser,
		message: "Login successful",
		organization_access_token: null as string | null,
	};
	const loginBody = JSON.stringify(loginResponse);

	// Mock chat unread count first (high priority) so Sidebar/ChatWidget never hit backend
	await page.route("**/api/chat/**/unread_count**", async (route) => {
		if (route.request().method() === "GET") {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ unread_count: 0 }),
			});
			return;
		}
		await route.continue();
	});

	await page.route("**/*", async (route) => {
		const req = route.request();
		const url = req.url();
		const method = req.method();

		if (method === "POST" && (url.includes("auth/login") || url.includes("auth%2Flogin"))) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: loginBody,
			});
			return;
		}
		if (method === "GET" && (url.includes("auth/me/teams") || url.includes("auth%2Fme%2Fteams"))) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ team_ids: [] }),
			});
			return;
		}
		if (method === "GET" && (url.includes("/auth/me") || url.includes("auth%2Fme")) && !url.includes("teams")) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(mockLoginUser),
			});
			return;
		}
		// Mock campaigns page APIs so /campaigns doesn't 500 when backend is not running
		if (method === "GET" && (url.includes("campaigns/dashboard_stats") || url.includes("campaigns%2Fdashboard_stats"))) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ total_campaigns: 0, total_tasks: 0 }),
			});
			return;
		}
		// GET /api/campaigns/ list (campaigns page fetchCampaigns)
		const isCampaignsList =
			method === "GET" &&
			(url.includes("api/campaigns") || url.includes("api%2Fcampaigns")) &&
			!url.includes("dashboard_stats") &&
			!url.includes("tasks") &&
			!/\/api\/campaigns\/\d+/.test(url);
		if (isCampaignsList) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ results: [] }),
			});
			return;
		}
		if (method === "GET" && (url.includes("core/projects") || url.includes("core%2Fprojects"))) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ results: [] }),
			});
			return;
		}
		if (method === "GET" && (url.includes("campaigns/tasks") || url.includes("campaigns%2Ftasks"))) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ results: [], items: [] }),
			});
			return;
		}
		// Mock chat unread count (Sidebar / ChatWidget fetch on mount)
		// Match any path containing unread_count (e.g. /api/chat/messages/unread_count/ or backend URL)
		if (method === "GET" && url.includes("unread_count")) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ unread_count: 0 }),
			});
			return;
		}
		await route.continue();
	});
}


export async function setupLoginFailureMock(page: Page, status = 401) {
	await page.route("**/*", async (route) => {
		const req = route.request();
		const url = req.url();
		const method = req.method();

		if (method === "POST" && (url.includes("auth/login") || url.includes("auth%2Flogin"))) {
			await route.fulfill({
				status,
				contentType: "application/json",
				body: JSON.stringify({ error: "Invalid credentials" }),
			});
			return;
		}
		// Mock auth/me and auth/me/teams so login page doesn't hit backend
		if (method === "GET" && (url.includes("auth/me/teams") || url.includes("auth%2Fme%2Fteams"))) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ team_ids: [] }),
			});
			return;
		}
		if (method === "GET" && (url.includes("/auth/me") || url.includes("auth%2Fme")) && !url.includes("teams")) {
			await route.fulfill({
				status: 401,
				contentType: "application/json",
				body: JSON.stringify({ detail: "Authentication credentials were not provided." }),
			});
			return;
		}
		await route.continue();
	});
}


export const SET_PASSWORD_TOKEN = process.env.E2E_SET_PASSWORD_TOKEN ?? "fake-set-password-token";


export async function setupSetPasswordMock(page: Page) {
	const setPasswordResponse = {
		message: "Password set successfully. You can now log in.",
		token: mockUser.token,
		refresh: "fake-refresh-token",
		user: mockLoginUser,
		organization_access_token: null as string | null,
	};
	const body = JSON.stringify(setPasswordResponse);

	await page.route("**/*", async (route) => {
		const req = route.request();
		const url = req.url();
		const method = req.method();

		if (method === "POST" && (url.includes("auth/google/set-password") || url.includes("auth%2Fgoogle%2Fset-password"))) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body,
			});
			return;
		}
		await route.continue();
	});
}


export const VERIFY_TOKEN = process.env.E2E_VERIFY_TOKEN ?? "fake-verify-token";


export async function setupVerifyMock(page: Page) {
	const verifyResponse = { message: "Email successfully verified." };

	await page.route("**/*", async (route) => {
		const req = route.request();
		const url = req.url();
		const method = req.method();

		if (method === "GET" && (url.includes("auth/verify") || url.includes("auth%2Fverify"))) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(verifyResponse),
			});
			return;
		}
		await route.continue();
	});
}


/** Build base64 auth_data for OAuth callback page (auth_data query param). */
export function getOAuthAuthDataBase64(): string {
	const payload = {
		token: mockUser.token,
		refresh: "fake-refresh-token",
		user: mockLoginUser,
		organization_access_token: null as string | null,
	};
	return Buffer.from(JSON.stringify(payload), "utf-8").toString("base64");
}


export async function setupRegisterMock(page: Page) {
	const registerResponse = { message: "User registered successfully. Account is ready to use." };

	await page.route("**/*", async (route) => {
		const req = route.request();
		const url = req.url();
		const method = req.method();

		if (method === "POST" && (url.includes("auth/register") || url.includes("auth%2Fregister"))) {
			await route.fulfill({
				status: 201,
				contentType: "application/json",
				body: JSON.stringify(registerResponse),
			});
			return;
		}
		await route.continue();
	});
}

/** Mock register API to return error (e.g. 409 duplicate email, 400 validation). */
export async function setupRegisterFailureMock(page: Page, status = 409, body?: object) {
	await page.route("**/*", async (route) => {
		const req = route.request();
		const url = req.url();
		const method = req.method();

		if (method === "POST" && (url.includes("auth/register") || url.includes("auth%2Fregister"))) {
			await route.fulfill({
				status,
				contentType: "application/json",
				body: JSON.stringify(body ?? { email: ["User with this email already exists."] }),
			});
			return;
		}
		await route.continue();
	});
}

/** Mock set-password API to return error (e.g. 400 invalid/expired token). */
export async function setupSetPasswordFailureMock(page: Page, status = 400, body?: object) {
	await page.route("**/*", async (route) => {
		const req = route.request();
		const url = req.url();
		const method = req.method();

		if (method === "POST" && (url.includes("auth/google/set-password") || url.includes("auth%2Fgoogle%2Fset-password"))) {
			await route.fulfill({
				status,
				contentType: "application/json",
				body: JSON.stringify(body ?? { token: ["Invalid or expired token."] }),
			});
			return;
		}
		await route.continue();
	});
}

/** Mock verify API to return error (e.g. 400 invalid/expired token). */
export async function setupVerifyFailureMock(page: Page, status = 400, body?: object) {
	await page.route("**/*", async (route) => {
		const req = route.request();
		const url = req.url();
		const method = req.method();

		if (method === "GET" && (url.includes("auth/verify") || url.includes("auth%2Fverify"))) {
			await route.fulfill({
				status,
				contentType: "application/json",
				body: JSON.stringify(body ?? { detail: "Invalid or expired verification token." }),
			});
			return;
		}
		await route.continue();
	});
}