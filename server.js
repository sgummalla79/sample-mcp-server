#!/usr/bin/env node

/**
 * HTTP-based MCP Server for Azure deployment
 * This creates an HTTP API that can be hosted on Azure and used by Claude
 */

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3000;

// Your Product API base URL
const API_BASE_URL = process.env.API_BASE_URL || 'https://sample-web-api.azurewebsites.net/';

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    apiBaseUrl: API_BASE_URL 
  });
});

// MCP tools definition endpoint
app.get('/mcp/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: 'get_products',
        description: 'Get all products or search products by query',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Optional search query to filter products',
            },
          },
        },
      },
      {
        name: 'get_product',
        description: 'Get a specific product by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Product ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_product',
        description: 'Create a new product',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Product name' },
            description: { type: 'string', description: 'Product description' },
            price: { type: 'number', description: 'Product price' },
            category: { type: 'string', description: 'Product category' },
            stockQuantity: { type: 'integer', description: 'Stock quantity' },
          },
          required: ['name', 'price', 'category', 'stockQuantity'],
        },
      },
      {
        name: 'update_product',
        description: 'Update an existing product',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Product ID' },
            name: { type: 'string', description: 'Product name' },
            description: { type: 'string', description: 'Product description' },
            price: { type: 'number', description: 'Product price' },
            category: { type: 'string', description: 'Product category' },
            stockQuantity: { type: 'integer', description: 'Stock quantity' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_product',
        description: 'Delete a product by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Product ID' },
          },
          required: ['id'],
        },
      },
    ],
  });
});

// Tool execution endpoint
app.post('/mcp/call', async (req, res) => {
  try {
    const { tool, arguments: args } = req.body;

    if (!tool) {
      return res.status(400).json({ error: 'Tool name is required' });
    }

    let result;
    switch (tool) {
      case 'get_products':
        result = await getProducts(args);
        break;
      case 'get_product':
        result = await getProduct(args);
        break;
      case 'create_product':
        result = await createProduct(args);
        break;
      case 'update_product':
        result = await updateProduct(args);
        break;
      case 'delete_product':
        result = await deleteProduct(args);
        break;
      default:
        return res.status(400).json({ error: `Unknown tool: ${tool}` });
    }

    res.json(result);
  } catch (error) {
    console.error('Error executing tool:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
});

// Individual tool endpoints (alternative access method)
app.get('/tools/products', async (req, res) => {
  try {
    const { search } = req.query;
    const result = await getProducts({ search });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/tools/products/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await getProduct({ id });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/tools/products', async (req, res) => {
  try {
    const result = await createProduct(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/tools/products/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await updateProduct({ id, ...req.body });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/tools/products/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await deleteProduct({ id });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tool implementation functions
async function getProducts(args) {
  const { search } = args || {};
  const url = new URL(`${API_BASE_URL}/api/products`);
  if (search) {
    url.searchParams.append('search', search);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const products = await response.json();
  return {
    success: true,
    data: products,
    message: search ? `Found ${products.length} products matching "${search}"` : `Retrieved ${products.length} products`
  };
}

async function getProduct(args) {
  const { id } = args;
  const response = await fetch(`${API_BASE_URL}/api/products/${id}`);
  
  if (response.status === 404) {
    return {
      success: false,
      error: `Product with ID ${id} not found`,
      data: null
    };
  }
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const product = await response.json();
  return {
    success: true,
    data: product,
    message: `Retrieved product: ${product.name}`
  };
}

async function createProduct(args) {
  const response = await fetch(`${API_BASE_URL}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const product = await response.json();
  return {
    success: true,
    data: product,
    message: `Product "${product.name}" created successfully with ID ${product.id}`
  };
}

async function updateProduct(args) {
  const { id, ...updateData } = args;
  const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });

  if (response.status === 404) {
    return {
      success: false,
      error: `Product with ID ${id} not found`,
      data: null
    };
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const product = await response.json();
  return {
    success: true,
    data: product,
    message: `Product "${product.name}" updated successfully`
  };
}

async function deleteProduct(args) {
  const { id } = args;
  const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
    method: 'DELETE',
  });

  if (response.status === 404) {
    return {
      success: false,
      error: `Product with ID ${id} not found`,
      data: null
    };
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return {
    success: true,
    data: null,
    message: `Product with ID ${id} deleted successfully`
  };
}

// Start server
app.listen(PORT, () => {
  console.log(`MCP Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`MCP Tools: http://localhost:${PORT}/mcp/tools`);
  console.log(`API Base URL: ${API_BASE_URL}`);
});

export default app;