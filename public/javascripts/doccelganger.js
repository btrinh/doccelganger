var allFiles = []
  , dropzone = $('#upload')
  , messages = $('#messages')
  , errors = false
  , fileFormats = []
  , socket = io.connect(window.location.hostname)
  //, socket = new io.Socket()
  , clientId
  , clientIp
  , nConverted = 0
  , docMIME = 'application/msword'
  , docxMIME = 'application/vnd.openxmlformats-officedocument' + 
               '.wordprocessingml.document'
  ;

$(function(){
  $('#no-js').remove();
});

socket.on('clientInfo', function (data) {
  clientId = data.id;
  clientIp = data.ip;
})

socket.on('uploadComplete', function (data) {
  nConverted++
  dlReady(data.index, data.link)
  alertMessage('success',
               'Finished converting ' + data.name + '!',
               ' Download is now ready.');
  
  if (nConverted == allFiles.length) {
    $('#convert')
      .removeClass('disabled')
      .text('Upload & Convert')
    nConverted = 0
  }
  
});

$('body')
  .bind('dragenter dragover', false)
  .bind('drop', onDrop);

$('#convert').click(function(e){
  e.preventDefault();
  if ( !$(this).hasClass('disabled') ) {
    checkErrors();
    
    // add convert format property to File object
    if (!errors) {
      $('#files').find('select[name="export-format"]').each(function(i){
        fileFormats[i] = $(this).val();
      });
  
      uploadFiles();
      $(this)
        .addClass('disabled')
        .text('Converting...');
        
      dropzone.find('tr').each(function(){
        //$(this).find('td:last')
        var dlStatus = $(this).find('td:last');
      
        //dlStatus.find('button[name="rmfile"]').hide();
        dlStatus.find('button').hide();
        
        dlStatus.append([
          '<div>',
            '<img src="images/loader.gif" style="padding: 0 15px" />',
            '<strong>Converting... </strong>',
          '</div>'
        ].join(''))

      });
    }
  }
});


// remove single file
$('button[name="rmfile"]').live('click', function(){
  var fileRow = $(this).parents('tr')
    , fileIndex = fileRow.index();
  fileRow.fadeOut('slow', function(){
    alertMessage('info', 'Deleted ' + allFiles[fileIndex].name,
                  ' File will not be uploaded and converted.');
                  
    $(this).remove();
    
    // delete from files array
    allFiles.splice(fileIndex, 1);
  });
});

$('#remove').click(function(){
  $('#files').find('tr').each(function(){
    $(this).fadeOut('fast', function(){
      $(this).remove();
    });
  });

  alertMessage('warning', 'All files have been removed!')
  allFiles = [];
});

function checkErrors(){
  if (allFiles.length < 1) {
    alertMessage('error', 'No files to upload!', 
                ' Drag n Drop a few, then try again.');
    
    setTimeout(function(){
      $('.alert-error').fadeOut('fast', function(){
        $(this).remove();
      });
    }, 5000);
    
    errors=true
  }
}

function alertMessage (alertType, boldMsg, msg, duration) {
  alertType = alertType || 'info';
  msg = msg || '';
  ms = duration || 5000;
  
  messages.append([
    '<div class="alert alert-' + alertType + '">',
      '<strong>' + boldMsg + '</strong>',
      msg,
    '</div>'
  ].join(''));
  
  setTimeout(function(){
    $('.alert-' + alertType).fadeOut('fast', function(){
      $(this).remove();
    });
  }, ms);
}

function uploadFiles(){
  $.each(allFiles, function (i, file) {
    var formData = new FormData();
    var xhr = new XMLHttpRequest();

    var onProgress = function (e) {
      if (e.lengthComputable) {
        var percentComplete = (e.loaded/e.total)*100;
        //console.log(percentComplete)
      }
    };

    var onError = function (err) {
      // something went wrong with upload
    };

    formData.append('file', file);
    formData.append('format', fileFormats[i]);
    formData.append('index', i);
    formData.append('clientId', clientId);
    formData.append('clientIp', clientIp);
    xhr.open('POST', '/upload', true);
    xhr.addEventListener('error', onError, false);
    xhr.addEventListener('progress', onProgress, false);
    //xhr.addEventListener('onreadystatechange', onReady, false);
    xhr.send(formData);
  });
}

function onDrop (e) {
  e.stopPropagation();
  e.preventDefault();

  if ( $('#files').children().size() < 1 ) 
    $('#instructions').remove()
  
  var files = $.makeArray(e.originalEvent.dataTransfer.files);
  
  if (files.length > 5) {
    alertMessage('error',
                 'Error:',
                 ' Only up to 5 files may be uploaded concurrently at this time',
                 8000)
  }
  else {
    $.each(files, function(i, file){
      if (file.size > 250000) {
        alertMessage('error',
                     'Cannot upload ' + file.name + '!',
                     ' Only files less than 250KB can be used!',
                     8000)
      } 
      else if (file.type == docxMIME || file.type == docMIME) {
        var fileHandle =
          { "file": file
          , "index": i
        }
    
        allFiles.push(file);

        var type = normalizeFiletype(file.type);
    
        var fileTemplate = [
          '<tr>',
            '<td class="span1">',
              '<img src="/images/icon-' + type + '.png" />',
            '</td>',
            '<td class="span4 file-name">',
              '<p><strong>' + file.name + '</strong></p>',
            '</td>',
            '<td class="span3">',
              '<select name="export-format">',
                '<option value="pdf">PDF (.pdf)</option>',
                '<option value="odt">Open Document (.odt)</option>',
                '<option value="html">HTML (.html)</option>',
                '<option value="docx">DOCX (.docx)</option>',
              '</select>',
            '</td>',
            '<td class="span4">',
              '<button name="rmfile" type="button" class="btn btn-warning">',
                '<i class="icon-trash icon-white"></i>',
                'Remove File',
              '</button>',
            '</td>',
          '</tr>'
        ].join('');
    
        $('#files').append(fileTemplate);
      } else {
        alertMessage('error',
                     'Cannot upload ' + file.name + '!',
                     ' Only Word Documents (.doc/x) files accepted',
                     8000)
      }
    });
  }
}

function dlReady (index, href) {
  dropzone.find('tr').eq(index).find('td:last div').remove();
  dropzone.find('tr').eq(index)
    //.find('button[name="rmfile"]')
    .find('button')
      .removeClass('btn-warning')
      .addClass('btn-success')
      .attr('name', 'dlfile')
      .html('<i class="icon-download icon-white"></i>Download File')
      .wrap('<a href="' + href + '" ></a>')
      .show()
}

function normalizeFiletype (filetype) {
  var type = filetype.split('/')[1];

  switch (type) {
    case 'msword':
      return 'word';
      break;
      
    case 'vnd.openxmlformats-officedocument' 
        + '.wordprocessingml.document':
      return 'word';
      break;
    
    case 'pdf':
      return 'pdf';
      break;
    
    default:
      console.log('no match');
      break;
  }
}