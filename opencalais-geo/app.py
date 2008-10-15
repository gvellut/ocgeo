from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from  google.appengine.api import urlfetch
import urllib
import cgi

OCURL = "http://beta.opencalais.com/enlighten/rest/"
LICENSEID = "cj6s8bbfhpn36nhvfkvnhqm6"

class OCProxy(webapp.RequestHandler):
  def get(self):
      str_ocargs = self.encoded_args()
      result = urlfetch.fetch(OCURL + "?licenseID=%s&%s" % (LICENSEID, str_ocargs) ,method = urlfetch.GET)
      self.write_response(result)
          
  def post(self):
      str_ocargs = self.encoded_args()
      result = urlfetch.fetch(OCURL, "licenseID=%s&%s" % (LICENSEID, str_ocargs) , urlfetch.POST)
      self.write_response(result)

  def encoded_args(self):
      ocargs = {}
      for arg in self.request.arguments():
          ocargs[arg] = self.request.get(arg)
      return urllib.urlencode(ocargs)

  def write_response(self,result):
      if result.status_code == 200:
          self.response.out.write(result.content)
      else:
          self.response.out.write('"error"')
      
application = webapp.WSGIApplication([('/.*/ocproxy', OCProxy)])

def main():
  run_wsgi_app(application)

if __name__ == "__main__":
  main()
