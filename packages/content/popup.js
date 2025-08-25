// popup.js (MV3 external script)
(function(){
  const openOptionsBtn = document.getElementById('openOptions');
  if(openOptionsBtn){
    openOptionsBtn.addEventListener('click', ()=>{
      if(chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
      else chrome.tabs.create({ url: chrome.runtime.getURL('content/options.html') });
    });
  }
  const badgeBtn = document.getElementById('badgeToggle');
  if(badgeBtn){
    badgeBtn.addEventListener('click', ()=>{
      chrome.tabs.query({active:true,currentWindow:true}, tabs => {
        const tab = tabs && tabs[0]; if(!tab) return;
        chrome.scripting.executeScript({
          target:{ tabId: tab.id },
          func: () => {
            try{
              const btn = document.querySelector('.flick-toggle-btn');
              if(btn){ btn.click(); return; }
              if(window.FLICK && window.FLICK.isSupportedArticle && window.FLICK.isSupportedArticle()){
                const open = !!document.querySelector('.flick-wrap-injected');
                if(open && window.FLICK.closeShorts) window.FLICK.closeShorts();
                else if(!open){
                  const data = window.FLICK.extractPost && window.FLICK.extractPost();
                  if(data && window.FLICK.buildUI) window.FLICK.buildUI(data);
                }
              }
            }catch(e){ /* ignore */ }
          }
        });
      });
    });
  }
})();
