export default async function handler(req, res) {
  try {
    const { default: app } = await import('../server.js');
    return app(req, res);
  } catch (error) {
    console.error('Function error:', error);
    return res.status(500).json({ 
      error: 'Function failed', 
      message: error.message,
      stack: error.stack 
    });
  }
}