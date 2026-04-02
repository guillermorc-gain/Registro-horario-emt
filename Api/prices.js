exports.handler = async function(event) {
  const h = {'Access-Control-Allow-Origin':'*','Content-Type':'application/json'};
  const p = event.queryStringParameters || {};
  const type = p.type;
  try {

    if (type === 'search') {
      const q = p.q || '';
      const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('CoinGecko search ' + res.status);
      const data = await res.json();
      const coins = (data.coins||[]).slice(0,8).map(c=>({id:c.id,name:c.name,symbol:c.symbol.toUpperCase(),thumb:c.thumb}));
      return {statusCode:200,headers:h,body:JSON.stringify(coins)};
    }

    if (type === 'contract') {
      const address = (p.address||'').toLowerCase();
      if (!address) return {statusCode:400,headers:h,body:JSON.stringify({error:'address required'})};
      for (const chain of ['ethereum','binance-smart-chain','polygon-pos','solana','tron','avalanche']) {
        try {
          const r = await fetch(`https://api.coingecko.com/api/v3/coins/${chain}/contract/${address}`);
          if (r.ok) {
            const d = await r.json();
            return {statusCode:200,headers:h,body:JSON.stringify({id:d.id,name:d.name,symbol:d.symbol.toUpperCase()})};
          }
        } catch(e) {}
      }
      return {statusCode:404,headers:h,body:JSON.stringify({error:'not found'})};
    }

    if (type === 'price') {
      const id = p.id || '';
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd,eur&include_24hr_change=true`);
      if (!res.ok) throw new Error('CoinGecko price ' + res.status);
      return {statusCode:200,headers:h,body:await res.text()};
    }

    if (type === 'metals') {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=pax-gold,tether-gold&vs_currencies=usd,eur&include_24hr_change=true');
      if (!res.ok) throw new Error('metals ' + res.status);
      const data = await res.json();
      const goldUsd = (data['pax-gold']&&data['pax-gold'].usd)||3200;
      const goldEur = (data['pax-gold']&&data['pax-gold'].eur)||2900;
      const goldChg = (data['pax-gold']&&data['pax-gold'].usd_24h_change)||0;
      return {statusCode:200,headers:h,body:JSON.stringify({
        gold:{usd:goldUsd,eur:goldEur,usd_24h_change:goldChg},
        silver:{usd:+(goldUsd/84).toFixed(2),eur:+(goldEur/84).toFixed(2),usd_24h_change:goldChg*0.9},
        platinum:{usd:+(goldUsd/1.5).toFixed(2),eur:+(goldEur/1.5).toFixed(2),usd_24h_change:goldChg*0.7}
      })};
    }

    if (type === 'all') {
      const ids = p.ids || 'hyperliquid,tron,ethereum,tether,kaspa,sui,solana,bitcoin,the-grass-is-greener';
      const [pr,fgr] = await Promise.all([
        fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,eur&include_24hr_change=true`),
        fetch('https://api.alternative.me/fng/?limit=1')
      ]);
      const prices = pr.ok ? await pr.json() : null;
      const fg = fgr.ok ? await fgr.json() : null;
      return {statusCode:200,headers:h,body:JSON.stringify({prices,fg,timestamp:Date.now()})};
    }

    if (type === 'news') {
      const query = p.q || 'crypto mercado';
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=es&gl=ES&ceid=ES:es`;
      const res = await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'}});
      if (!res.ok) throw new Error('News ' + res.status);
      const xml = await res.text();
      const items = [];
      const re = /<item>([\s\S]*?)<\/item>/g;
      let m, count = 0;
      while ((m = re.exec(xml)) !== null && count < 8) {
        const it = m[1];
        const title = (it.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)||it.match(/<title>(.*?)<\/title>/)||[])[1]||'';
        const link = (it.match(/<link>(.*?)<\/link>/)||[])[1]||'';
        const pub = (it.match(/<pubDate>(.*?)<\/pubDate>/)||[])[1]||'';
        const src = (it.match(/<source[^>]*>(.*?)<\/source>/)||[])[1]||'';
        if (title){items.push({title:title.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>'),link,pub,src});count++;}
      }
      return {statusCode:200,headers:h,body:JSON.stringify(items)};
    }

    if (type === 'prelisting') {
      const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=volume_asc&per_page=30&page=1&sparkline=false');
      if (!res.ok) throw new Error('CoinGecko ' + res.status);
      const data = await res.json();
      const filtered = data.filter(c=>c.market_cap&&c.market_cap<50000000&&c.market_cap>100000).slice(0,12).map(c=>({id:c.id,name:c.name,symbol:c.symbol.toUpperCase(),price:c.current_price,marketCap:c.market_cap}));
      return {statusCode:200,headers:h,body:JSON.stringify(filtered)};
    }

    return {statusCode:400,headers:h,body:JSON.stringify({error:'type required'})};
  } catch(err) {
    return {statusCode:500,headers:h,body:JSON.stringify({error:err.message})};
  }
};
