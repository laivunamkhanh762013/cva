const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\ADMIN\\Desktop\\Chess\\Dai-Phu-FF\\admin.html', 'utf8');

// Mock browser DOM
global.document = {
  getElementById: (id) => ({
    textContent: '',
    style: {},
    classList: { add: () => {}, remove: () => {} },
    appendChild: () => {},
    value: '',
    innerHTML: ''
  }),
  querySelectorAll: () => []
};
global.sessionStorage = { getItem: () => 'true', removeItem: () => {} };
global.localStorage = { getItem: () => '[]', setItem: () => {} };
global.formatVND = (n) => (n || 0) + 'd';

const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (scriptMatch) {
  try {
    eval(scriptMatch[1]);
    console.log('Script evaluated successfully!');
    // Test renderDashboard with sample order
    allOrders = [{
      id: 'DP514786',
      productName: 'Proxy Aim iOS',
      planName: 'Key 1 Ngày',
      price: 10000,
      user: 'testuser',
      phone: '0123456789',
      time: '28/09/2026 00:18:23',
      status: 'approved'
    }];
    renderDashboard();
    console.log('renderDashboard executed with 0 errors!');
  } catch(e) {
    console.error('Error during execution:', e);
  }
}