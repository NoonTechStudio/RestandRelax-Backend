// config/envValidation.js
const validateEnvironment = () => {
  const requiredEnvVars = [
    'MONGO_URI',
    'JWT_SECRET', 
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'EMAIL_USER',
    'EMAIL_PASS'
  ];

  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing);
    process.exit(1);
  }

  console.log('✅ All environment variables validated');
};

export default validateEnvironment;