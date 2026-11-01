$(document).ready(function () {
    $('#myForm').submit(async function (event) {
        event.preventDefault();
        const result = $('#result').empty();
        const button = $('#myForm button').prop('disabled', true);
        try {
            const url = new URL($('#url').val().trim());
            const host = url.hostname.toLowerCase();
            let videoId;
            if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Enter a valid YouTube URL.');
            if (host === 'youtu.be') videoId = url.pathname.slice(1);
            else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)) {
                videoId = url.pathname === '/watch' ? url.searchParams.get('v') :
                    /^\/(?:shorts|embed)\/([^/]+)\/?$/.exec(url.pathname)?.[1];
            }
            if (!/^[A-Za-z0-9_-]{11}$/.test(videoId || '')) throw new Error('Enter a valid YouTube video URL.');
            const response = await fetch('/api/video?id=' + encodeURIComponent(videoId));
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Unable to load video information.');
            // Insert API content as text/values, never as executable HTML.
            if (data.thumbnail) $('<img>', { src: data.thumbnail, alt: 'Video thumbnail', class: 'img-thumbnail' }).appendTo(result);
            for (const [id, label, value] of [
                ['title', 'Title', data.title],
                ['description', 'Description', data.description],
                ['tags', 'Tags', data.tags.join(', ')]
            ]) {
                const group = $('<div>', { class: 'form-group' }).appendTo(result);
                $('<label>', { for: id, text: label + ':' }).appendTo(group);
                $('<textarea>', { id, class: 'form-control', rows: id === 'title' ? 2 : 8, readonly: true }).val(value).appendTo(group);
            }
        } catch (error) {
            $('<p>', { role: 'alert', text: error.message || 'Unable to load video information.' }).appendTo(result);
        } finally {
            button.prop('disabled', false);
        }
    });
});
