addEventListener('fetch', event => {
    const _url = event.request.url;
      event.respondWith(handleRequest(event.request));
  })


async function handleRequest(request) {
return new Response(request, {
    headers: { 'content-type': 'application/json' },
    status: 200,
})
}