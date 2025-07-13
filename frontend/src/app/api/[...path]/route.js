// Mock user database for development
const mockUsers = [
  { id: 1, email: 'test123@gmail.com', password: 'password123', name: 'Test User' },
  { id: 2, email: 'admin@mediajira.com', password: 'admin123', name: 'Admin User' }
];

// Mock JWT token generator
function generateMockJWT(user) {
  return `mock-jwt-token-${user.id}-${Date.now()}`;
}

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
  const body = await request.json();
  
  // Handle mock auth endpoints
  if (path === 'auth/login') {
    const { email, password } = body;
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Validate credentials
    const user = mockUsers.find(u => u.email === email && u.password === password);
    
    if (!user) {
      return Response.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    const token = generateMockJWT(user);
    
    return Response.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  }
  
  if (path === 'auth/register') {
    const { email, password, name } = body;
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if user already exists
    const existingUser = mockUsers.find(u => u.email === email);
    
    if (existingUser) {
      return Response.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }
    
    // Create new user
    const newUser = {
      id: mockUsers.length + 1,
      email,
      password,
      name
    };
    
    mockUsers.push(newUser);
    
    const token = generateMockJWT(newUser);
    
    return Response.json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name
      }
    });
  }
  
  // Handle other API requests normally
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const targetUrl = `${backendUrl}/api/${path}`;

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('cookie') && {
          'Cookie': request.headers.get('cookie')
        })
      },
      body: JSON.stringify(body),
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