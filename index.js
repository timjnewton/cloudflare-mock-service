addEventListener('fetch', event => {
    const _url = event.request.url;
      event.respondWith(handleRequest(event.request));
  })


async function handleRequest(request) {

// headers dont display cos they are not a JSON array so have to do this fudge to create a new attribute that is a JSON array.
// https://developers.cloudflare.com/workers/examples/logging-headers
// remove and reassign the request object to make it easier to display.
const headers = [...request.headers];
delete request["headers"]
request.headers = headers

// process the URL get the path 
const addr = new URL(request.url);
//const host = addr.host;
const path = addr.pathname;
let user = "";
if (path !== null && path !== "")
{
  user = path.split('/')[1]
}

// If a body has been passed we want to fetch it as text and then add it to the response body. 
if (request.bodyUsed)
{
  request.bodyText = { "value" : await request.text() }
}

// remove the cloudflare part of the request as we dont need this info
delete request["cf"]

await KV.put(user + "~" + Date.now().toString(), JSON.stringify(request), {expirationTtl : 600} );

return new Response(JSON.stringify(request), {
    headers: { 'content-type': 'application/json' },
    status: 200,
})
}