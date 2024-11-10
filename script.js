$(document).ready(function(){
    $("#myForm").submit(function(event){
        event.preventDefault();
        var url = $("#url").val(); // fetch url
        var videoId = getVideoId(url);
        //alert(videoId);
        getYoutubeInfo(videoId);
    })
    function getVideoId(url){
        return url.split("v=")[1] //fetch video id
    }
    function getYoutubeInfo(videoId){
        var api_key = "AIzaSyAF44JblCTCWT0O3DczwQCgnOSNOV1Hxyw"
        var api_url = "https://www.googleapis.com/youtube/v3/videos?key="+api_key+"&fileds=items(snippet(title,decription,tags,thumbnails))&part=snippet&id="+videoId;
        $.get(api_url,function(data){
            $("#result").empty();
            $("#url").val("");

            var title = data.items[0].snippet.title;
            var description = data.items[0].snippet.description;
            var tags = data.items[0].snippet.tags;
            var thumbnail = data.items[0].snippet.thumbnails.maxres.url;
            
            tags.forEach(tag => {
                tag += tag + ",";
            });

            $("#result").append(

                `
                <img src = "${thumbnail}" class="img-thumbnail"/>
                
                <div class="form-group">
                    <label for="title">Title:</label>
                    <input type="text" class="form-control" disabled="true" value="${title}"/>
                </div>

                <div class="form-group">
                    <label for="description">Description:</label>
                    <textarea class="form-control" disabled="true" cols="15" rows ="8" >${description}</textarea>
                </div>

                <div class="form-group">
                    <label for="tags">Tags:</label>
                    <textarea class="form-control" disabled="true" cols="15" rows ="8" >${tags}</textarea>
                </div>

               `
            )
        })
    }
})