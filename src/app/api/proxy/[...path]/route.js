import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://my-strapi-project-yysn.onrender.com';

export async function GET(request, { params }) {
  try {
    const { path } = await params;
    const pathStr = Array.isArray(path) ? path.join('/') : path;
    
    // Récupérer les query params
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    const url = `${API_URL}/api/${pathStr}${queryString ? `?${queryString}` : ''}`;
    
    // Récupérer le token d'autorisation s'il existe
    const authHeader = request.headers.get('Authorization');
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    const response = await fetch(url, {
      headers,
      cache: 'no-store',
    });
    
    const data = await response.json();
    
    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const { path } = await params;
    const pathStr = Array.isArray(path) ? path.join('/') : path;
    
    const url = `${API_URL}/api/${pathStr}`;
    const authHeader = request.headers.get('Authorization');
    const contentType = request.headers.get('Content-Type') || '';
    
    // Gérer les uploads FormData (multipart/form-data)
    if (contentType.includes('multipart/form-data') || pathStr === 'upload') {
      const formData = await request.formData();
      
      const headers = {};
      if (authHeader) {
        headers['Authorization'] = authHeader;
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });
      
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }
    
    // Gérer les requêtes JSON normales
    const body = await request.json();
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { path } = await params;
    const pathStr = Array.isArray(path) ? path.join('/') : path;
    
    const body = await request.json();
    const url = `${API_URL}/api/${pathStr}`;
    
    const authHeader = request.headers.get('Authorization');
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { path } = await params;
    const pathStr = Array.isArray(path) ? path.join('/') : path;
    
    const url = `${API_URL}/api/${pathStr}`;
    
    const authHeader = request.headers.get('Authorization');
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });
    
    const data = await response.json();
    
    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
