import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function FAQSection() {
  return (
    <section id="faq" className="py-20 bg-gray-900/50">
      <div className="container mx-auto px-4 lg:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-xl text-gray-300">Everything you need to know about Podstore</p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="bg-gray-800/30 border-gray-700 rounded-lg px-6">
              <AccordionTrigger className="text-white hover:text-gray-300">
                How does the recording quality compare to desktop software?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Podstore uses advanced web technologies to capture studio-quality audio and video directly in your
                browser. Our local recording ensures zero compression during capture, delivering quality that matches
                or exceeds traditional desktop recording software.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="bg-gray-800/30 border-gray-700 rounded-lg px-6">
              <AccordionTrigger className="text-white hover:text-gray-300">
                What happens if my internet connection drops during recording?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Your recording continues locally even if your internet connection drops. Once reconnected, Podstore
                automatically resumes uploading your content in chunks. Nothing is lost, and you can continue
                recording without interruption.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="bg-gray-800/30 border-gray-700 rounded-lg px-6">
              <AccordionTrigger className="text-white hover:text-gray-300">
                How many people can join a recording session?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Podstore supports up to 10 participants in a single recording session. Each participant's audio and
                video is recorded locally on their device and uploaded separately, ensuring the highest quality for
                each track.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="bg-gray-800/30 border-gray-700 rounded-lg px-6">
              <AccordionTrigger className="text-white hover:text-gray-300">
                What file formats are supported for download?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                You can download your recordings in multiple formats including MP3, WAV, and M4A for audio, and MP4,
                WebM for video. We also provide separate tracks for each participant to give you maximum flexibility
                in post-production.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="bg-gray-800/30 border-gray-700 rounded-lg px-6">
              <AccordionTrigger className="text-white hover:text-gray-300">
                Is there a free plan available?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Yes! Podstore offers a free plan that includes up to 3 hours of recording per month, support for up to
                3 participants, and all core features. Perfect for trying out the platform or for light usage.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </section>
  )
} 