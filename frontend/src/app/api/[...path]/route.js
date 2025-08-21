export async function GET(request, { params }) {
  const path = params.path.join('/');
  const url = new URL(request.url);
  const searchParams = url.searchParams.toString();

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const targetUrl = `${backendUrl}/api/${path}${searchParams ? `?${searchParams}` : ''}`;

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')
        }),
        ...(request.headers.get('cookie') && {
          'Cookie': request.headers.get('cookie')
        })
      },
    });

    const data = await response.json();

    return Response.json(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('API proxy error:', error);
    return Response.json(
      { error: 'Failed to fetch data from backend' },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  const path = params.path.join('/');
  const contentType = request.headers.get('content-type') || '';

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const targetUrl = `${backendUrl}/api/${path}`;

  try {
    const outgoingHeaders = {
      ...(request.headers.get('authorization') && {
        'Authorization': request.headers.get('authorization')
      }),
      ...(request.headers.get('cookie') && {
        'Cookie': request.headers.get('cookie')
      }),
      ...(contentType && { 'Content-Type': contentType }),
    };

    // Stream the original body to preserve multipart boundaries and binary data
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: outgoingHeaders,
      body: request.body,
    });

    const data = await response.json();

    return Response.json(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('API proxy error:', error);
    return Response.json(
      { error: 'Failed to send data to backend' },
      { status: 500 }
    );
  }
}