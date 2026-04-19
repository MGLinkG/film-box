const axios = require('axios');
axios.get('https://i1.vvmp4.com/upload/vod/20210703-13/c66d464fd22173ece49772127a051a6d.jpg').then(r => console.log('OK')).catch(e => console.log(e.response.status));
