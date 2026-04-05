export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/info")) {
      return new Response(JSON.stringify({ author: "Anthony Wu" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Write analytics: country + user agent
    const country = request.headers.get('cf-ipcountry') || 'Unknown';
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    
    // Categorize user agent (Chrome, Safari, Firefox, Mobile, etc)
    let clientType = 'Other';
    if (userAgent.includes('Chrome')) clientType = 'Chrome';
    else if (userAgent.includes('Safari')) clientType = 'Safari';
    else if (userAgent.includes('Firefox')) clientType = 'Firefox';
    else if (userAgent.includes('Edge')) clientType = 'Edge';
    
    let deviceType = 'Desktop';
    if (userAgent.includes('Mobile') || userAgent.includes('Android')) deviceType = 'Mobile';
    else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) deviceType = 'Tablet';
    
    try {
      // Combine all dimensions into single index
      const dimensions = `${country}|${clientType}|${deviceType}`;
      await env.ANALYTICS.writeDataPoint({
        indexes: [dimensions],
        doubles: [1], // count
      });
    } catch (e) {
      // Fail silently, don't block requests
      console.error('Analytics write failed:', e);
    }

    return env.ASSETS.fetch(request);
  },
};
