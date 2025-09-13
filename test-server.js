#!/usr/bin/env node

/**
 * Simple test script for the MCP Server
 * This file is optional - you can include it if you want to run tests
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

async function runTests() {
  console.log('🧪 Testing MCP Server...');
  console.log(`Base URL: ${BASE_URL}`);
  
  try {
    // Test 1: Health check
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ Health check passed:', health.status);
    } else {
      console.log('❌ Health check failed');
      return;
    }

    // Test 2: Tools endpoint
    console.log('\n2. Testing tools endpoint...');
    const toolsResponse = await fetch(`${BASE_URL}/mcp/tools`);
    if (toolsResponse.ok) {
      const tools = await toolsResponse.json();
      console.log(`✅ Tools endpoint returned ${tools.tools.length} tools`);
    } else {
      console.log('❌ Tools endpoint failed');
    }

    // Test 3: Get products
    console.log('\n3. Testing get products via MCP call...');
    const mcpResponse = await fetch(`${BASE_URL}/mcp/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'get_products', arguments: {} })
    });
    
    if (mcpResponse.ok) {
      const result = await mcpResponse.json();
      if (result.success) {
        console.log(`✅ MCP call successful: ${result.message}`);
      } else {
        console.log('⚠️ MCP call returned error:', result.error);
      }
    } else {
      console.log('❌ MCP call failed');
    }

    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

runTests();