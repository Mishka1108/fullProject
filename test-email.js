// test-email.js
const { sendEmail, sendVerificationEmail, testEmailDeliverability, checkSpamScore } = require('./utils/sendEmail');
require('dotenv').config();

/**
 * ყოვლისმომცველი Email ტესტირება
 */

// ANSI Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

const log = (message, color = 'white') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const separator = (title) => {
  log('\n' + '='.repeat(60), 'cyan');
  log(`  ${title}`, 'cyan');
  log('='.repeat(60), 'cyan');
};

/**
 * 1. Environment Variables შემოწმება
 */
const checkEnvironment = () => {
  separator('1. Environment Variables შემოწმება');
  
  const required = ['EMAIL_USER', 'EMAIL_PASS', 'SITE_NAME'];
  let allGood = true;
  
  required.forEach(key => {
    if (process.env[key]) {
      log(`✓ ${key}: ${process.env[key].substring(0, 5)}...`, 'green');
    } else {
      log(`✗ ${key}: არ არის მითითებული`, 'red');
      allGood = false;
    }
  });
  
  if (allGood) {
    log('\n✓ Environment variables OK', 'green');
  } else {
    log('\n✗ Environment variables არასრულია', 'red');
    process.exit(1);
  }
  
  return allGood;
};

/**
 * 2. Gmail App Password ფორმატის შემოწმება
 */
const checkAppPassword = () => {
  separator('2. Gmail App Password ფორმატის შემოწმება');
  
  const password = process.env.EMAIL_PASS;
  
  if (!password) {
    log('✗ EMAIL_PASS არ არის მითითებული', 'red');
    return false;
  }
  
  // App Password should be 16 characters
  if (password.length === 16) {
    log('✓ App Password სწორი სიგრძისაა (16 ნიშანი)', 'green');
    
    // Check if it's alphanumeric
    if (/^[a-zA-Z0-9]+$/.test(password)) {
      log('✓ App Password ფორმატი სწორია', 'green');
      return true;
    } else {
      log('⚠ App Password შეიცავს არასტანდარტულ სიმბოლოებს', 'yellow');
      return true; // Still might work
    }
  } else {
    log(`✗ App Password სიგრძე არასწორია: ${password.length} (უნდა იყოს 16)`, 'red');
    log('ინსტრუქცია: Gmail → Google Account → Security → App passwords', 'yellow');
    return false;
  }
};

/**
 * 3. SMTP Connection Test
 */
const testSMTPConnection = async () => {
  separator('3. SMTP Connection Test');
  
  try {
    log('SMTP კავშირის ტესტირება...', 'yellow');
    const result = await testEmailDeliverability();
    
    if (result) {
      log('✓ SMTP კავშირი წარმატებულია', 'green');
      return true;
    } else {
      log('✗ SMTP კავშირი ვერ მოხერხდა', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ SMTP Error: ${error.message}`, 'red');
    
    // Specific error messages
    if (error.code === 'EAUTH') {
      log('მიზეზი: Authentication Failed', 'red');
      log('გამოსწორება: შეამოწმეთ Email/Password', 'yellow');
    } else if (error.code === 'ECONNECTION') {
      log('მიზეზი: Connection Failed', 'red');
      log('გამოსწორება: შეამოწმეთ ინტერნეტი', 'yellow');
    }
    
    return false;
  }
};

/**
 * 4. Spam Score Test
 */
const testSpamScore = async () => {
  separator('4. Spam Score Test');
  
  const testSubjects = [
    'ანგარიშის დადასტურება',
    'URGENT! ACT NOW! FREE MONEY!',
    'MarketZone - ვერიფიკაცია',
    'WINNER! CONGRATULATIONS! CLICK HERE NOW!'
  ];
  
  for (const subject of testSubjects) {
    const content = `გამარჯობა, ${subject} - ეს არის ტესტი`;
    const result = await checkSpamScore('test@example.com', subject, content);
    
    if (result.score === 0) {
      log(`✓ "${subject}" - OK (Score: ${result.score})`, 'green');
    } else if (result.score <= 2) {
      log(`⚠ "${subject}" - საშუალო (Score: ${result.score})`, 'yellow');
      log(`  Triggers: ${result.triggers.join(', ')}`, 'yellow');
    } else {
      log(`✗ "${subject}" - მაღალი spam score (Score: ${result.score})`, 'red');
      log(`  Triggers: ${result.triggers.join(', ')}`, 'red');
    }
  }
};

/**
 * 5. Test Email გაგზავნა
 */
const sendTestEmail = async (testEmail) => {
  separator('5. Test Email გაგზავნა');
  
  if (!testEmail) {
    log('✗ Test email address არ არის მითითებული', 'red');
    return false;
  }
  
  try {
    log(`ტესტის ელფოსტის გაგზავნა: ${testEmail}`, 'yellow');
    
    // Simple email test
    const result1 = await sendEmail(
      testEmail,
      'MarketZone - ტესტი',
      'ეს არის ტესტური მესიჯი MarketZone-დან. თუ ეს მესიჯი მოგდით, ყველაფერი კარგად მუშაობს!'
    );
    
    log(`✓ ტესტი 1 - Simple Email: ${result1.messageId}`, 'green');
    
    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verification email test
    const testUrl = `https://yoursite.com/verify?token=test123&email=${encodeURIComponent(testEmail)}`;
    const result2 = await sendVerificationEmail(
      testEmail,
      'ვერიფიკაცია',
      testUrl
    );
    
    log(`✓ ტესტი 2 - Verification Email: ${result2.messageId}`, 'green');
    
    log('\n✓ ორივე ელფოსტა წარმატებით გაიგზავნა!', 'green');
    log('შეამოწმეთ თქვენი ელფოსტა (მათ შორის Spam ფოლდერი)', 'cyan');
    
    return true;
    
  } catch (error) {
    log(`✗ ელფოსტის გაგზავნა ვერ მოხერხდა: ${error.message}`, 'red');
    
    // დეტალური error analysis
    if (error.message.includes('Authentication')) {
      log('გამოსწორება: Gmail App Password-ის შემოწმება', 'yellow');
    } else if (error.message.includes('Connection')) {
      log('გამოსწორება: ინტერნეტ კავშირის შემოწმება', 'yellow');
    } else if (error.message.includes('rejected')) {
      log('გამოსწორება: Email content-ის შემოწმება (შესაძლოა spam-ად მიიჩნევს)', 'yellow');
    }
    
    return false;
  }
};

/**
 * 6. Delivery Status Check
 */
const checkDeliveryStatus = async (messageId) => {
  separator('6. Delivery Status Check');
  
  if (!messageId) {
    log('MessageId არ არის მითითებული', 'yellow');
    return;
  }
  
  log(`Message ID: ${messageId}`, 'blue');
  log('Gmail-ში delivery status-ის შესამოწმებლად:', 'cyan');
  log('1. Gmail → Settings → See all settings', 'cyan');
  log('2. Filters and Blocked Addresses', 'cyan');
  log('3. Search for sent messages', 'cyan');
  
  // თუ G Suite-ს იყენებთ, შეგიძლიათ Admin Console-ში შეამოწმოთ
  if (process.env.EMAIL_USER.includes('@')) {
    const domain = process.env.EMAIL_USER.split('@')[1];
    if (domain !== 'gmail.com') {
      log(`G Suite Domain: ${domain}`, 'cyan');
      log('Admin Console → Reports → Email Log Search', 'cyan');
    }
  }
};

/**
 * 7. მთავარი ტესტირების ფუნქცია
 */
const runAllTests = async () => {
  log('MarketZone Email System ტესტირება დაწყებულია...', 'magenta');
  
  // Test email address prompt
  const testEmail = process.argv[2] || 'your-test-email@gmail.com';
  
  if (testEmail === 'your-test-email@gmail.com') {
    log('\n⚠ Test email address არ არის მითითებული', 'yellow');
    log('გამოყენება: node test-email.js your-email@gmail.com', 'yellow');
    log('ან შეცვალეთ default value კოდში\n', 'yellow');
  }
  
  let allTestsPassed = true;
  
  // 1. Environment Check
  if (!checkEnvironment()) {
    allTestsPassed = false;
  }
  
  // 2. App Password Check
  if (!checkAppPassword()) {
    allTestsPassed = false;
  }
  
  // 3. SMTP Connection Test
  if (!await testSMTPConnection()) {
    allTestsPassed = false;
  }
  
  // 4. Spam Score Test
  await testSpamScore();
  
  // 5. Test Email (only if previous tests passed)
  let messageId = null;
  if (allTestsPassed) {
    const emailSent = await sendTestEmail(testEmail);
    if (emailSent) {
      messageId = 'test-message-id';
    }
  }
  
  // 6. Delivery Status
  await checkDeliveryStatus(messageId);
  
  // Final Results
  separator('ტესტირების შედეგები');
  
  if (allTestsPassed) {
    log('🎉 ყველა ტესტი წარმატებით გავიდა!', 'green');
    log('Email system მზადაა გამოყენებისთვის', 'green');
  } else {
    log('❌ ზოგიერთი ტესტი ვერ გავიდა', 'red');
    log('მოაგვარეთ ზემოთ მითითებული პრობლემები', 'red');
  }
  
  log('\n📧 შემდეგი ნაბიჯები:', 'cyan');
  log('1. შეამოწმეთ თქვენი email inbox', 'cyan');
  log('2. თუ არ მოდის - შეამოწმეთ Spam ფოლდერი', 'cyan');
  log('3. Gmail-ში დაამატეთ sender contacts-ში', 'cyan');
  log('4. Production-ში გამოყენებამდე გააკეთეთ მეტი ტესტი', 'cyan');
};

/**
 * მარტივი ტესტი (ბრძანება)
 */
const quickTest = async () => {
  const testEmail = process.argv[3] || 'test@example.com';
  
  try {
    log('Quick Test - SMTP Connection...', 'yellow');
    const connectionOk = await testEmailDeliverability();
    
    if (connectionOk) {
      log('✓ SMTP Connection OK', 'green');
      
      log(`Quick Test - Sending email to ${testEmail}...`, 'yellow');
      const result = await sendEmail(testEmail, 'Quick Test', 'This is a quick test message');
      
      log(`✓ Email sent successfully: ${result.messageId}`, 'green');
    } else {
      log('✗ SMTP Connection failed', 'red');
    }
  } catch (error) {
    log(`✗ Quick test failed: ${error.message}`, 'red');
  }
};

// Command line arguments
const command = process.argv[2];

if (command === 'quick') {
  quickTest();
} else if (command === 'help' || command === '-h') {
  log('Email Testing Commands:', 'cyan');
  log('node test-email.js [your-email@gmail.com] - სრული ტესტი', 'white');
  log('node test-email.js quick [your-email@gmail.com] - მარტივი ტესტი', 'white');
  log('node test-email.js help - ეს დახმარება', 'white');
} else {
  runAllTests();
}

module.exports = {
  runAllTests,
  quickTest,
  checkEnvironment,
  checkAppPassword,
  testSMTPConnection,
  testSpamScore,
  sendTestEmail
};