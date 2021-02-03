/**
 * Display A Public Profile Pane
 *
 * This is the subject's primary representation in the world.
 * When anyone scans the QR code of their WebID on their card, it takes them
 * to here and here alone.  This had better be good.  This had better be
 * worth the subject joining solid for
 * - informative
 *
 * Usage: paneRegistry.register('profile/profilePane')
 * or standalone script adding onto existing mashlib.
 */

import { icons, ns, style, widgets } from 'solid-ui'
import { NamedNode, Store } from 'rdflib'
import { paneDiv } from './profile.dom'
import { PaneDefinition } from 'pane-registry'
import { getChat, longChatPane } from 'chat-pane'

const thisPane: PaneDefinition = {
  global: false,

  icon: icons.iconBase + 'noun_15059.svg',

  name: 'profile',

  label: function (subject, context) {
    const t = (context.session.store as Store).findTypeURIs(subject)
    if (
      t[ns.vcard('Individual').uri] ||
      t[ns.vcard('Organization').uri] ||
      t[ns.foaf('Person').uri] ||
      t[ns.schema('Person').uri]
    ) {
      return 'Profile'
    }
    return null
  },

  render: function (subject, context) {
    const store = context.session.store as Store

    async function doRender (
      container: HTMLElement,
      subject: NamedNode | null,
      dom: HTMLDocument
    ) {
      if (!subject) throw new Error('subject missing')
      const profile = subject.doc()
      const otherProfiles = store.each(subject, ns.rdfs('seeAlso'), null, profile) as Array<NamedNode>
      if (otherProfiles.length > 0) {
        try {
          await store.fetcher.load(otherProfiles)
        } catch (err) {
          const msg = `Profile ${subject} sameAs target error: ${err} err`
          console.log(msg, err)
          container.appendChild(widgets.errorMessageBlock(dom, msg))
        }
      }

      const backgroundColor = store.anyValue(subject, ns.solid('profileBackgroundColor'), null, subject.doc()) || '#ffffff'
      // Todo: check format of color matches regexp and not too dark
      container.style.backgroundColor = backgroundColor // @@ Limit to pale?
      const highlightColor = store.anyValue(subject, ns.solid('profileHighlightColor', null, subject.doc())) || '#090' // @@ beware injection attack
      container.style.border = `0.3em solid ${highlightColor}`
      container.style.borderRadius = '0.5em'
      container.style.padding = '0.7em'
      container.style.marginTop = '0.7em'
      const table = container.appendChild(dom.createElement('table'))
      // const top = table.appendChild(dom.createElement('tr'))
      const main = table.appendChild(dom.createElement('tr'))
      const bottom = table.appendChild(dom.createElement('tr'))
      const statusArea = bottom.appendChild(dom.createElement('div'))
      statusArea.setAttribute('style', 'padding: 0.7em;')

      function heading (str: string) {
        const h = main.appendChild(dom.createElement('h3')) // bigger than the headings within forms
        h.style = style.heading3Style
        h.style.color = highlightColor // User defined
        h.textContent = str
        return h
      }

      // Todo: only show this if there is vcard info
      heading('Contact')

      const chatContainer = dom.createElement('div')
      let exists
      try {
        exists = await getChat(subject, false)
      } catch (e) {
        exists = false
      }
      if (exists) {
        chatContainer.appendChild(longChatPane.render(exists, context, {}))
      } else {
        const button = widgets.button(
          dom,
          undefined,
          'Chat with me',
          async () => {
            try {
              const chat: NamedNode = await getChat(subject)
              chatContainer.innerHTML = ''
              chatContainer.appendChild(longChatPane.render(chat, context, {}))
              chatContainer.style.margin = '0.7em'
            } catch (e) {
              chatContainer.appendChild(widgets.errorMessageBlock(dom, e.message))
            }
          },
          { needsBorder: true }
        )
        chatContainer.appendChild(button)
      }
      main.appendChild(chatContainer)

      const contactDisplay = paneDiv(context, subject, 'contact')
      contactDisplay.style.border = '0em' // override form
      main.appendChild(contactDisplay)

      if (store.holds(subject, ns.foaf('knows'))) {
        heading('Solid Friends')
        widgets.attachmentList(dom, subject, container, {
          doc: profile,
          modify: false,
          predicate: ns.foaf('knows'),
          noun: 'friend'
        })
      }
    }

    const dom = context.dom
    const container = dom.createElement('div')
    doRender(container, subject, dom) // async
    return container // initially unpopulated
  } // render()
} //

export default thisPane
// ENDS