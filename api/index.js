// Vercel serverless function handler
// This file wraps your Express app for serverless deployment

export default async function handler(req, res) {
  try {
    // Dynamically import the app to avoid initialization issues
    const { default: app } = await import('../server.js');
    
    // Let Express handle the request
    return app(req, res);
  } catch (error) {
    console.error('❌ Function invocation error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}