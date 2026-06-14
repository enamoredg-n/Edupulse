type LoginResponse = {
  accessToken: string;
  user: {
    college: {
      code: string;
      name: string;
    };
    email: string;
  };
};

const API_BASE = process.env.API_BASE ?? 'http://127.0.0.1:4000/api/v1';

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
) {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }

  return (await response.json()) as T;
}

async function login(email: string, password: string) {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

async function expectBlocked(path: string, token: string) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (![403, 404].includes(response.status)) {
    throw new Error(
      `${path} should be blocked but returned ${response.status}`,
    );
  }

  return response.status;
}

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const gl = await login('admin@edupulse.edu', 'Admin@12345');
  const sharda = await login('admin@sharda.edu', 'Admin@12345');

  assert(
    gl.user.college.code === 'GLBAJAJ',
    'GL Bajaj admin has wrong college',
  );
  assert(
    sharda.user.college.code === 'SHARDA',
    'Sharda admin has wrong college',
  );

  const glSummary = await request<{
    responseCount: number;
    submissionCount: number;
  }>('/dashboard/summary', { token: gl.accessToken });
  const shardaSummary = await request<{
    responseCount: number;
    submissionCount: number;
  }>('/dashboard/summary', { token: sharda.accessToken });

  assert(
    glSummary.responseCount > 0,
    `GL Bajaj should see its own feedback data, got ${glSummary.responseCount}`,
  );
  assert(
    shardaSummary.responseCount > 0,
    `Sharda should see its own feedback data, got ${shardaSummary.responseCount}`,
  );
  assert(
    shardaSummary.responseCount !== glSummary.responseCount,
    'Tenant summaries should not collapse into the same shared response count',
  );
  assert(
    shardaSummary.submissionCount !== glSummary.submissionCount,
    'Tenant summaries should not collapse into the same shared submission count',
  );

  const glReports = await request<{ id: string }[]>('/reports', {
    token: gl.accessToken,
  });

  let crossTenantReportStatus: number | 'SKIPPED' = 'SKIPPED';
  let crossTenantPdfStatus: number | 'SKIPPED' = 'SKIPPED';

  if (glReports.length > 0) {
    const reportId = glReports[0].id;
    crossTenantReportStatus = await expectBlocked(
      `/reports/${reportId}`,
      sharda.accessToken,
    );
    crossTenantPdfStatus = await expectBlocked(
      `/reports/${reportId}/pdf`,
      sharda.accessToken,
    );
  }

  console.log(
    JSON.stringify(
      {
        apiBase: API_BASE,
        checks: {
          glCollege: gl.user.college.code,
          glResponses: glSummary.responseCount,
          glSubmissions: glSummary.submissionCount,
          shardaCollege: sharda.user.college.code,
          shardaResponses: shardaSummary.responseCount,
          shardaSubmissions: shardaSummary.submissionCount,
          crossTenantReportStatus,
          crossTenantPdfStatus,
        },
        result: 'PASS',
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        apiBase: API_BASE,
        error: error instanceof Error ? error.message : String(error),
        result: 'FAIL',
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
