import writerMachine from './writer/writer.js'
import criticMachine from './critic/critic.js'
import reflectionMachine from './reflection/reflection.js'
import routingMachine from './collaboration/collaboration.js'
import toolApprovalMachine from './human_in_the_loop/human_in_the_loop.js'
import codeExecutionMachine from './code_execution/code_execution.js'
import agentGenerationMachine from './agent_generation/agent_generation.js'
import writerChatMachine from './writer_chat/writer_chat.js'

// Default agent definitions
export default {
  writer: [
	writerMachine,
	{ input: { threadMessages: [{ role: 'user', content: 'Write a recipe for tacos' }] } }
  ],
  toolApproval: [
	toolApprovalMachine,
	{ input: { threadMessages: [{ role: 'user', content: 'Write a recipe for tacos' }] } }
  ],
  writer_chat: [
	writerChatMachine
  ],
  critic: [
	criticMachine,
	{ input: { threadMessages: [{ role: 'assistant', content: "To make tacos, fill the tortillas with tomatoes, cheese, and grated carrots." }] } }
  ],
  reflection: [
	reflectionMachine,
	{ input: { dish: "Tacos" } }
  ],
  router: [routingMachine],
  codeExecution: [codeExecutionMachine, { input: { threadMessages: [{ role: 'user', content: `1. Search for your profile on the Whitepages website 
Go to whitepages.com. Type your name and city in the search box and click ‘Search.’

Whitepages front page search box
2. Click ‘View Details’ next to your Whitepages profile
Don’t click the ‘View Full Report’ button, even if you see your own profile, as you’ll have to pay to access this.

Instead, scroll down until you find another profile, with a ‘View Details’ button next to it. Click the button, and you’ll be taken to your listing with your personal information.

Whitepages listings
3. Copy the URL of your Whitepages profile
Once you have opened your Whitepages listing, copy your profile URL.

Whitepages listing and profile URL
4. Paste your listing link in the Whitepages.com opt-out form
Go to the Whitepages opt-out page and paste the URL of your listing.

Click ‘Next.’ 

Pasting profile URL into Whitepages opt out form
5. Confirm your Whitepages listing
The next page will ask you to confirm that this is your listing.

Click the ‘Remove Me’ button.

Confirming Whitepages listing and asking to be removed
6. Give a reason for wanting a White pages removal
You’ll be asked why you want to opt out of Whitepages. Choose “I just want to keep my information private.”

Click ‘Next.’

Giving a reason for Whitepages removal
7. Enter your phone number to confirm your identity
Next, you’ll need to verify your identity with a phone call. Type in your phone number to receive a verification code. 

Make sure to check the little box that confirms you want to remove the listing from white pages. 

Click ‘Call now to verify.’

Typing in phone number into Whitepages opt out form to confirm identity
8. Share a verification code
Finally, you’ll receive an automated call asking for the verification code that pops up on the next screen. When prompted, dial the verification code. 

The call will tell you that your opt-out request has been accepted.

It may take up to 24 hours for your profile to be removed from Whitepages.

Whitepages verification code for opt out
Congratulations! You have now successfully completed a whitepages.com opt-out! ` }] } }],
  agentGenerationMachine: [
	agentGenerationMachine,
	{ input: { goal_info: 'You are a travel agent. Help me plan a trip to paris.' } }
  ]
};