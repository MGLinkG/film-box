const axios = require('axios');
axios.get('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=' + encodeURIComponent('盗梦空间')).then(res => console.log(res.data[0][0][0]));
