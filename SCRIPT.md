# Recording script

Word-for-word narration for every slide. Generated from the speaker notes
in `slides/index.html` - **edit the deck, not this file**, then re-run
`python3 tools/build_script.py`.

| | |
|---|---|
| Essentials | 32 slides · ~35 min |
| Short | 40 slides · ~42 min |
| Full lesson | 55 slides · ~91 min |
| Live demos | 11 slides carry a command |


`[RUN DEMO n]` in the narration marks where to switch to the terminal.

---


## Slide 1 — Retrieval Augmented Generation · **essentials**


Welcome. Before anything else, a quick word on who is talking.

I am Wil. I have been working in AI for about a decade, which means I started well before GPTs made any of this fashionable — back when you built your own models and your own data pipelines because there was nothing to call. More recently I have been working on incentivised data training structures with NEAR AI: the mechanisms that reward people for contributing the data and the compute that models are actually trained on. And running through all of it, I have built a lot of retrieval and ingestion systems, on a lot of different stacks.

I mention that for one reason. This is not a lesson I read and repeated. It is the shape of a system I have built more than once — and every mistake in it is a mistake I have made.

So: we are going to build a Retrieval Augmented Generation system from nothing, and more importantly, understand every piece of it.

Here is the one-line version of what RAG is for. How do you give a language model access to a hundred thousand documents, without ever putting a hundred thousand documents into the prompt? That is the problem. Everything else is mechanics.

This is a work-along session. I am going to switch between these slides and a terminal, and every number you see on a slide is something we actually run. Nothing here is asserted and left hanging — if I claim two pieces of text have similar embeddings, we measure it live.

Everything is at ragverse dot d i y — these slides, the playgrounds, and all of the code. The address stays in the corner of every slide.

You will need Python three point ten or newer, an editor, and one OpenAI API key. The whole thing costs well under a cent in embeddings.

Let's start with why this problem exists at all.


> **Essentials edition — tighter narration:**
>
> Quick word on who is talking. **I am Wil.**
>
> I have been working in AI for **about a decade** — which means I started well before GPTs made any of this fashionable, back when you built your own models and your own data pipelines.
>
> More recently I have been working on **incentivised data training structures with NEAR AI**. And running through all of it, I have built a lot of retrieval and ingestion systems, on a lot of different stacks.
>
> I mention that for one reason. **This is not a lesson I read and repeated.** It is a system I have built more than once, and **every mistake in it is one I have made.**
>
> Here is the problem in one line. **How do you give a language model access to a hundred thousand documents, without ever putting a hundred thousand documents in the prompt?**
>
> That is the problem. Everything after it is mechanics.
>
> So here is where we are going. **Why RAG exists**, and why waiting for a bigger model will not fix it. **The shape of the system** — two pipelines, one diagram. **What an embedding really is**, tested against a real model.
>
> Then **five real documents pushed all the way through**, so you see what each step produces. And at the end, **the mistake that breaks most first builds** — the one that raises no error at all.
>
> One thing before we start. Everything is at **ragverse dot d i y** — these slides, five playgrounds you can drive yourself, and all the code. Open it in another tab now if you want to follow along.


## Slide 2 — What you will be able to do

**Section:** 00 · Outcomes


These are the outcomes. Six of them.

By the end you will be able to explain why a bigger context window does not remove the need for RAG — that is the objection everyone raises first, and it has two answers.

You will be able to define the vocabulary: token, context window, chunk, embedding, dimension, vector database, retriever, top k. These words get used loosely and that is where confusion comes from, so we will pin each one down as it appears.

You will be able to draw both halves of a RAG system from memory. There are two halves and people routinely collapse them into one, which is where the mental model breaks.

You will be able to look at a question and predict which chunks come back, and say why.

You will have built a working ingestion pipeline — real code, on your machine, about sixty lines.

And last, you will know the one mistake that silently breaks most first builds. Silently is the important word there. We will break it on purpose at the end so you know what it looks like.


## Slide 3 — Two windows, eight demos · **essentials**

**Section:** 00 · How this session runs  
**Run:** `./run.sh check`


A word on how this runs, so you can follow along rather than just watch.

I have two windows: these slides, and a terminal. Whenever an orange bar appears on a slide, that is my cue to stop talking and run the command written in it. The output you then see on the slide is the genuine output of that command — I have not typed nice numbers into a slide anywhere.

Everything lives in the repository, behind one entry point. Run dot s h setup once, and then run dot s h slides for this deck, or run dot s h demo five for any demo. There is a check command too, which is what I am running now — it verifies the environment, the packages, the documents and the API key before we start, so nothing surprises us on camera.

The demo folder has eight numbered scripts, one per concept, and ingestion underscore pipeline dot py is the finished sixty-line file that all of this builds toward.

If you are working along, pause whenever you need to. The scripts are all independent except that seven and eight need the database that six builds.

Let me run the check, and we will begin.


> **Essentials edition — tighter narration:**
>
> One word on how this runs. Wherever a terminal block appears on a slide, the line above it names the command that printed it.
>
> Behind them is a repository: eight numbered scripts, one per concept, and a finished sixty-line pipeline, all behind a single entry point. Whether the demos get run here or you run them afterwards, the output is the same. The address is on the last slide.
>
> The scripts stand alone, except that seven and eight need the database the sixth one builds.


## Slide 4 — Why RAG exists · **essentials**

**Section:** Part one


Part one. Why RAG exists at all.

I want to frame this carefully, because the framing matters. The problem RAG solves is not that language models are stupid. Modern models are extraordinarily capable. The problem is that they are small — not in intelligence, but in how much they can look at in one go.

Let's make that concrete.


> **Essentials edition — tighter narration:**
>
> Part one. **Why RAG exists at all.**
>
> And it is worth framing this carefully, because people get it backwards.
>
> **The problem is not that language models are stupid.** Modern models are extraordinarily capable.
>
> **The problem is that they are small.** Not in intelligence — in **how much they can look at in one go.**


## Slide 5 — Several hundred internal documents · **short**

**Section:** 01 · The problem


Picture a company with several hundred internal documents. Policy guidelines, technical specifications, customer support logs, contracts. Ordinary business documents.

Somebody asks a question, and exactly one of those documents contains the answer. The obvious move — and this is genuinely what everyone tries first — is to paste all of them into the model and ask the question.

That does not work. And the reason it does not work is the whole reason this lesson exists. So let me give you the definition to hold on to, and then we will take apart why the obvious approach fails.


> **Essentials edition — tighter narration:**
>
> Picture a company with a few hundred internal documents. Policies, specs, support logs, contracts. Ordinary things, none of them written for a machine to read.
>
> Nobody has read all of them. Whoever wrote any one of them has probably left. And the answer to a question somebody asks this afternoon is sitting in exactly one of them, and no one knows which.
>
> That is the situation this is built for. Hold onto it — the next slide is the whole idea in a sentence.


## Slide 6 — Retrieval Augmented Generation · **essentials**

**Section:** 01 · Definition


Here is the definition. Retrieval Augmented Generation is a language model combined with a retrieval system. The retrieval system searches external sources — documents, databases, knowledge bases — and it pulls only the relevant pieces into the prompt, at the moment the model needs them.

Read that last part again, because it is the part people skip. At the moment the model needs them. Nothing is loaded in advance into the model. Nothing is trained into the model. The relevant text is fetched, per question, and placed in the prompt.

So the model does not get everything. It gets the right few pages.

That is the entire idea. I mean that literally — everything else in this session is mechanics for how you find the right few pages quickly. If you leave with only one sentence, leave with that one.


> **Essentials edition — tighter narration:**
>
> Picture this. You work somewhere with a few hundred internal documents, and somebody asks a question that **exactly one of them** answers.
>
> The obvious move is to paste them all in and ask. **That does not work** — and why it does not work is the whole lesson.
>
> So here is the definition. Retrieval Augmented Generation is **a language model plus a retrieval system**.
>
> The retrieval system searches your documents and pulls **only the relevant pieces** into the prompt, at the moment the model needs them.
>
> The model does not get everything. **It gets the right few pages.**
>
> And I want to plant something early here, because people hear "RAG" and file it away as **one technique among many.** It is not.
>
> **Almost every language-model product you have used is doing this underneath.** A model that searches the web and cites what it found. An assistant that answers from your own files. A support bot that links the article it used.
>
> **Retrieval is the default way a model is given anything it was not trained on.**
>
> That is the entire idea. Everything after this is mechanics.


## Slide 7 — Where you have met one — and why · **essentials**

**Section:** 01 · Why anyone builds one


Before any mechanics, the question underneath all of this: why does anyone build one?

Start with where you have already met one, because you have. If you have used a support chatbot that answered your question and then linked you to the exact help article it got that from — that was retrieval. If you have watched a model search the web and cite what it found — retrieval. If you have asked a coding assistant something about your own repository and got a real answer rather than a plausible one — retrieval. Every company with an internal Q&A bot over its own policies is running one of these.

Now the reasons teams build them. There are three, and they are worth separating.

The first is your data. Whatever model you are using was not trained on your contracts, your runbooks, or your support tickets. It cannot know them. Ask it anyway and it will cheerfully invent something that sounds right.

The second is today's data. A policy changed this morning. Somebody shipped a new product page an hour ago. You are not going to retrain a model because a policy changed — you drop the document in, and the next question picks it up.

The third is receipts, and this is the one people underrate. The retriever knows exactly which chunks it used to answer, so the answer can point back at them. In most organisations an answer nobody can check is worth close to nothing. Being able to click through to the paragraph it came from is often the entire reason the project got approved.

And then the question I get every single time: why not just fine-tune the model on our documents?

Fine-tuning teaches a model a style. A format, a voice, a way of reasoning about a domain. It is a very expensive way to teach it a fact, and a hopeless way to teach it a fact that changes on Tuesday. It also gives you nothing to cite. Fine-tuning changes how a model speaks. Retrieval changes what it knows, and lets it show its working.


> **Essentials edition — tighter narration:**
>
> Let me make that concrete, and then answer the obvious question.
>
> You have met these. The support chatbot that answered you and then **linked the exact help article**. A coding assistant that answers about **your** repository rather than a generic one. Internal question-and-answer over a company's own policies.
>
> So why do teams build them? **Three reasons.**
>
> **The first is your data.** Nothing was trained on your contracts or your support tickets. Ask anyway, and a model will cheerfully invent something plausible.
>
> **The second is today's data.** A policy changed this morning. You are not going to retrain a model over that.
>
> **And the third is receipts.** The retriever knows exactly which chunks it used, so the answer can point at them. **An answer nobody can check is worth close to nothing.**
>
> Which answers the question I get every single time. **Why not just fine-tune?**
>
> Fine-tuning teaches a model **a style** — a format, a voice. It is an expensive way to teach it a fact, a hopeless way to teach it one that changes on Tuesday, and it gives you nothing to cite.
>
> **Fine-tuning changes how a model speaks. Retrieval changes what it knows.**


## Slide 8 — Models do not read words · **essentials**

**Section:** 02 · Tokens  
**Run:** `python 01_tokens.py`


A word you will need: the token.

A token is the unit of text a model processes. Sometimes it is a whole word. Often it is a fragment of one. Models do not read letters, and they do not read words — they read tokens. This matters because every limit and every price you will ever meet is denominated in tokens, not words.

Let me run demo one and show you.

[RUN DEMO 01]

Look at that. The sentence "Retrieval augmented generation is powerful" is five words. The model counts seven tokens. And look at how it split: "Retrieval" — a fairly ordinary English word — got broken into three pieces, R-e-t, r-i-e, v-a-l. Whereas "augmented", "generation", "powerful" each survived as a single token.

That is the rule in action. Common words are one token. Rarer or longer words get split into several. And notice the underscores in that output — those are spaces. Spaces travel with the token that follows them, which is why it is "underscore augmented" rather than "augmented".

The rule of thumb worth memorising: one token is roughly three quarters of an English word. So a thousand words is roughly thirteen hundred tokens.


> **Essentials edition — tighter narration:**
>
> The first word you need is **token**.
>
> A token is the unit of text a model actually processes. Sometimes that is a whole word. Often it is a fragment of one.
>
> Models do not read letters. They do not read words. **They read tokens.**
>
> And that matters for a very practical reason. **Every limit you will ever hit, and every price you will ever pay, is counted in tokens.**
>
> Look at the output. Five words went in. **Seven tokens** came back.
>
> "Retrieval" split into three pieces. "Augmented" and "powerful" survived whole. Common words are one token; rarer ones fragment.
>
> So here is the rule of thumb to carry: **one token is about three quarters of an English word.**


## Slide 9 — Everything has to fit inside one window · **essentials**

**Section:** 02 · The context window


The next word you will need: the context window.

The context window is the total number of tokens a model can hold in a single request. And the critical detail is that everything counts toward it — everything you send in, and everything the model writes back out. They share one budget. Past that limit, the information is simply not there. Not summarised, not compressed. Not there.

Right now, in 2026, the major models have converged on one million tokens. GPT-5.5, Gemini 3.1 Pro, Claude Opus 4.8, Claude Sonnet 5 — they all sit at a million. A few advertise ten million, though I'd treat that with some suspicion: no published benchmark shows answer quality holding anywhere near the top of those windows. Advertised capacity and usable capacity are not the same thing.

Still — a million tokens is a genuinely enormous number. It is several very long books.

I want to flag something about that figure: verify it before you quote it. These numbers move every few months, and a slide deck is exactly the kind of place a stale number goes to live forever.

So — two million tokens. That sounds like it should be plenty. Let's see how it compares to how much text an actual company holds.


> **Essentials edition — tighter narration:**
>
> Second word: **the context window.**
>
> That is the total number of tokens a model can hold in **one request**. Everything you send, and everything it writes back, sharing one budget.
>
> **Past that limit, the information is simply not there.**
>
> In 2026 the major models have converged on **one million tokens**. A few advertise ten million — though no benchmark shows quality holding near the top of those windows.
>
> A million sounds like plenty. So let us see how it compares to what a company actually holds.


## Slide 10 — Read the scale carefully · **essentials**

**Section:** 02 · The scale gap


This is the same demo still running — the second half of demo one.

Now, this is a logarithmic scale, and I need you to read it carefully, because logarithmic scales are quietly deceptive. Each step to the right is ten times larger than the last, not one step larger. The bars look comparable. The numbers are not.

Start at the top. One chunk — that is a single retrievable piece of text, and we will define it properly in a moment — is about a thousand tokens.

The five Wikipedia articles we are about to ingest come to seventy-two thousand tokens. That is our whole corpus for today, and notice — it comfortably fits inside a frontier model. For five documents you genuinely do not need RAG. I want to be honest about that rather than pretend otherwise.

A frontier model window: one million. The largest advertised: ten million.

Now watch what happens. A mid-sized company with one terabyte of documents: two hundred and fifty billion tokens. That is two hundred and fifty thousand times larger than the model window.

An enterprise archive at one petabyte: two hundred and fifty trillion.

So here is the thing to take away. That gap is not a gap you close by waiting for bigger models. If context windows got a thousand times bigger tomorrow — which they will not — you would still be short of the mid-sized company by a factor of two hundred and fifty. This is a structural problem, not a temporary one.


> **Essentials edition — tighter narration:**
>
> Read this one carefully, because it is **a logarithmic scale**. Each step to the right is **ten times** the last — not one step.
>
> Our five articles come to **seventy-two thousand tokens**. That fits inside a frontier model easily.
>
> And I will say the honest thing here: **for five documents you genuinely do not need RAG.** I would rather tell you that than pretend otherwise.
>
> Now watch what happens. A mid-sized company with a terabyte of documents: **two hundred and fifty billion tokens.** That is **two hundred and fifty thousand times** a model window. An enterprise archive is a thousand times larger again.
>
> **This is not a gap you close by waiting for bigger models.**
>
> And there is a second reason, which matters just as much. You pay per token — and burying the one relevant paragraph in half a million irrelevant ones gives you **worse** answers, not better.


## Slide 11 — Try it: when do you actually need RAG?

**Section:** 02 · Interactive


Let's make that scale argument something you can feel rather than just read, because the numbers are so large they stop meaning anything.

Drag the slider. It runs from one megabyte of text up to one petabyte.

[DRAG TO ~1 MB]
At a megabyte we are at about two hundred and fifty thousand tokens. That fits in a frontier window with room to spare, and the panel says so — you do not need RAG for this. Be honest about that. If your entire corpus is a handful of documents, retrieval is overhead, not architecture.

[DRAG TO ~1 GB]
One gigabyte. Two hundred and fifty million tokens. Now we need over a hundred context windows. There is no prompt you can write that holds this.

[DRAG TO 1 TB]
And a terabyte — a mid-sized company — needs a hundred and twenty-five thousand full context windows.

Watch the cost figure while you drag, because that is the one people do not think about. Embedding a terabyte once costs about five thousand dollars. That is a one-off, not per question — but it is a real number, and it is why you choose your embedding model carefully before you start rather than after.

The threshold where RAG stops being optional is lower than people expect. Somewhere around a few megabytes, this stops being a choice.


## Slide 12 — You also pay per token · **short**

**Section:** 02 · The second reason


There is a second reason, and it matters just as much as the first, but people forget it because the first one is so dramatic.

Even when everything does fit — even in the case where your documents are small enough — sending all of it is still the wrong move.

Three reasons. One, you pay per token, so you are paying for every irrelevant word. Two, it is slow; latency scales with how much you send. And three — this is the one that surprises people — you get worse answers.

That third point is counterintuitive so let me be explicit about it. If you bury the one relevant paragraph inside five hundred thousand tokens of unrelated material, the model has a harder job finding it than if you had simply handed it the paragraph. More context is not more helpful. Relevant context is helpful.

So: sending five hundred thousand tokens of irrelevant context to answer one question is expensive, slow, and worse. Sending the five right paragraphs is cheap, fast, and better.

That is the case for RAG, complete. Now let's look at how it is actually built.


> **Essentials edition — tighter narration:**
>
> There is a second reason, and people forget it because the first one is so dramatic.
>
> Even when everything does fit, sending all of it is still wrong. You pay per token, so you pay for every irrelevant word. Latency scales with what you send. And — this is the counterintuitive one — you get worse answers.
>
> Bury the one relevant paragraph inside five hundred thousand tokens and the model has a harder job than if you had handed it the paragraph. More context is not more helpful. Relevant context is.


## Slide 13 — The shape of the system · **essentials**

**Section:** Part two


Part two. The shape of the system.

If there is one slide in this whole session to photograph, it is the next one. A RAG system is two pipelines, not one. People collapse them into one in their heads, and that is precisely where the mental model breaks and the questions get confused.

So: two pipelines. Learn them separately, and everything after this is easy.


> **Essentials edition — tighter narration:**
>
> Part two. **The shape of the system.**
>
> Everything so far has been about **why**. This is the **what** — and it is one diagram.


## Slide 14 — Two pipelines · **essentials**

**Section:** 03 · The whole system in one picture


Here it is. The whole system in one picture.

The top row is the ingestion pipeline, and the thing to understand about it is that it runs once, ahead of time, before anybody asks anything. Source documents go in. They get chunked — cut into small pieces. Each piece goes through an embedding model, which turns it into a vector, a list of numbers. Those vectors get stored in a vector database. Done. That pipeline does not run again until your documents change.

The bottom row is the retrieval pipeline, and it runs every single time someone asks a question. The question comes in. It goes through an embedding model and becomes a vector. A retriever compares that vector against everything in the database and ranks by closeness. The top matching chunks come back. And those chunks, plus the question, go to the LLM, which writes the answer.

Now look at the two orange boxes. The embedding model appears in both rows. That is not me being lazy with the drawing. It is the same model, and it has to be the same model. If those two boxes ever contain different models, the entire system fails — and it fails silently, with no error message. We are going to break that rule deliberately in the last demo so you know exactly what it looks like.

Keep this diagram. Every RAG system you will ever build, from a weekend project to production, is this diagram with more engineering around each box.


> **Essentials edition — tighter narration:**
>
> **This is the slide to photograph.**
>
> A RAG system is **two pipelines, not one.** People collapse them into one in their heads, and **that is exactly where the mental model breaks.**
>
> **The top row is ingestion, and it runs once** — before anybody asks anything. Documents go in, they get chunked into small pieces, each piece goes through an embedding model and becomes a vector, and the vectors land in a database. **Then it stops.**
>
> **The bottom row is retrieval, and it runs on every single question.** The question becomes a vector. A retriever ranks every stored vector by closeness. The top matches come back. And those chunks, plus the question, go to the model.
>
> Now look at the two orange boxes. **The same embedding model appears in both rows.**
>
> That is not a drawing shortcut. **We are going to break it deliberately at the end** to show you why it matters.


## Slide 15 — A chunk is a slice, not a section · **essentials**

**Section:** 04 · Chunking


Next word: the chunk.

Chunking is breaking large documents into small pieces. You choose the size. If you set it to a thousand tokens, then ten million tokens of documents becomes ten thousand chunks. Simple arithmetic.

Now, the word "chunk" is doing some work here and I want to be precise. A chunk is a slice, not a section. Chunks are cut by size, not by meaning. They do not respect chapter boundaries, headings, or the structure of an argument. A naive splitter will cut straight through the middle of a sentence, or a table, without hesitating. You will see exactly that when we get to the chunking step.

So why cut at all? Why not keep whole documents? Because the chunk is your unit of retrieval — it is the smallest thing the system is able to hand back. If your chunks are whole Wikipedia articles, then a question about one sentence returns the entire article, and you are back to stuffing the context window with mostly-irrelevant text. Which is the problem we started with.

Chunk size is therefore a real design decision, and there are techniques for cutting more intelligently. Those come later in the track. For today we cut simply, and I will show you exactly what that costs.


> **Essentials edition — tighter narration:**
>
> Next word: **the chunk.**
>
> Chunking is cutting documents into small pieces, and **you choose the size.**
>
> Here is the nuance that matters. **A chunk is a slice, not a section.** Chunks are cut by size, not by meaning. They do not respect headings or arguments — a naive splitter will cut through the middle of a sentence without hesitating.
>
> So why cut at all? Because **the chunk is your unit of retrieval** — the smallest thing the system can hand back.
>
> Make a whole document one chunk, and a question about one line drags **the entire forty-page employee handbook** into the prompt, because one sentence in it matched.
>
> And now you are back to stuffing the context window — **which is the thing you were trying to avoid.**


## Slide 16 — This is not an LLM · **essentials**

**Section:** 04 · The embedding model  
**Run:** `python 02_embedding_shape.py`


Next box in the diagram: the embedding model. And the first thing to say, because it trips everybody up, is that this is not an LLM. Different model, different job. It does not generate text. It does not chat. You give it text, and it gives you back a list of numbers. That is all it does.

Let me run demo two.

[RUN DEMO 02]

Look at the three rows. I sent it one word. I sent it an eight-word sentence. I sent it a three-hundred-and-thirty-seven-word paragraph. And every single time, what came back was fifteen hundred and thirty-six numbers. Not more for the paragraph. Not fewer for the single word. Always exactly fifteen thirty-six.

Underneath you can see the first few actual numbers. They are small, they are signed, and — this is worth saying plainly — no individual number there means anything you can name. Nobody knows what dimension four hundred and twelve represents. That is fine. It is not how they are used.

The property that matters is the fixed length. One word in or nine hundred words in, the vector is the same size. And that is the property the entire system is built on, because it means any two pieces of text — however different in length — become two lists of the same size, and two lists of the same size can be compared with simple arithmetic.

That is the trick. Everything downstream depends on it.


> **Essentials edition — tighter narration:**
>
> Next box: **the embedding model.** And here is the thing that trips everybody up.
>
> **This is not an LLM.** Different model, different job. Nothing is generated. There is no vocabulary to sample from. It is far smaller and far cheaper. **Text goes in, a list of numbers comes out.** That is the whole interface.
>
> Look at the three rows. One word in. Eight words in. **Three hundred and thirty-seven words in.** And every single time, **exactly fifteen hundred and thirty-six numbers** come back.
>
> So why is it always the same length? Because of what the model actually does. It reads the text and produces **one vector per token**, the way any transformer does. Then it **pools** them — averages them, roughly — into **a single vector**. **Pooling is the step that throws the length away.**
>
> **And that fixed length is the property the whole system rests on.** Any two pieces of text, however different in length, become two lists of the same size — and two lists of the same size can be compared with arithmetic.
>
> Three things about those numbers that are worth carrying.
>
> **They come back unit length.** I checked — the norm is one, to four decimal places. Which means **cosine similarity and a plain dot product give you the same answer.** Cosine is not a preference here. It is the cheapest thing that works.
>
> **There is a ceiling** — about **eight thousand tokens**. Send more than that and the tail is **silently truncated.** No error, no warning. Another reason to chunk.
>
> **And the dimensions are ordered by importance.** Keep the first **five hundred and twelve**, renormalise, and the rankings still hold — **a third of the storage.** That is also how we are going to fake a convincing failure later on.


## Slide 17 — Similar meaning, similar numbers · **essentials**

**Section:** 05 · What an embedding is


So what is an embedding, actually? This is the part people get stuck on, so we will slow down here.

A vector embedding is a list of numbers that stands in for a piece of text. Each number in that list is called a dimension. Two more words for the list — and dimension just means one position in it.

And here is the sentence that matters more than anything else in this session: text with similar meaning produces similar numbers.

It is worth being concrete about why that is the whole ballgame. Somebody types "my card got declined". The help article that answers them says "payment failures". Not one word in common. A keyword search — the thing every support site had for twenty years — returns nothing at all, and the customer gives up. An embedding model puts those two pieces of text next to each other, because it was trained on how words are used rather than how they are spelled. Matching on meaning instead of spelling is the entire thing you are buying here. That is the property. That is what an embedding model is trained to do.

Now, this table is a teaching device, and it is a fake. I have made up three dimensions and labelled them size, domesticated, and sound. Real embeddings do not work like this — the dimensions are not labelled, and nobody knows what any individual one means. But the fake is useful for building intuition, so read it column by column.

Cat and kitten sit almost on top of each other on every dimension — thirty-four and thirty-three on size, both eight on domestication, seven point five and seven point one on sound. Because a kitten is a young cat. Dog shares the domestication value but sits further out on size. And elephant is far away from all three on everything — two hundred and ten on size against thirty-four.

That is the intuition. Now let's check whether it survives contact with a real embedding model, because I do not want you taking a made-up table on faith.


> **Essentials edition — tighter narration:**
>
> So what is an embedding? **A list of numbers standing in for a piece of text.** Each number is called **a dimension** — that is two more words for your list.
>
> And here is the sentence that matters more than any other today.
>
> **Text with similar meaning produces similar numbers.**
>
> That one sentence is why any of this works. Somebody types **"my card got declined."** The help article says **"payment failures."**
>
> **Not a single word in common.** A keyword search returns nothing at all. An embedding puts those two right next to each other, because they mean the same thing.
>
> **That is what you are buying.**
>
> Now, this table is a teaching device, and I want to be straight with you: **the numbers in it are invented.** Cat and kitten sit almost on top of each other. Dog shares the domestication value but differs on size. Elephant is far from all three.
>
> Real embeddings are not labelled, and nobody knows what any single dimension means. **So let us check whether that intuition survives contact with a real model.**


## Slide 18 — Does that actually hold? · **essentials**

**Section:** 05 · Eight real words  
**Run:** `python 03_similar_meaning.py`


Let's measure it. Demo three.

[RUN DEMO 03]

This takes eight words, embeds each one with a real OpenAI model, and measures how close every pair actually is. One point zero would be identical.

Top of the list: cat to dog, zero point six oh three. Then cat to kitten at zero point five seven. Then a clear drop — coffee, tea, apple, elephant, mango, all down in the three-hundreds and two-hundreds.

Now, I want to point at something honest here, because it contradicts the tidy table on the previous slide. Our made-up table said kitten should be closest to cat. The real model puts dog first, with kitten second. So the toy intuition was directionally right and specifically wrong.

Why? Because bare single words are a weak signal. "Cat" and "dog" co-occur in text constantly — they are the two canonical pets — whereas "kitten" is a narrower, less common word. Real systems almost never embed single words; they embed whole paragraphs, where there is far more meaning to work with. So do not over-read the ordering within a cluster.

But look at the bottom two lines, because that is where the claim really holds. Domestic animals: the average similarity inside that group is zero point five three, and to everything outside it, zero point three two. Drinks: zero point six one inside, zero point three one outside. Every group is meaningfully tighter inside than out.

That is a neighbourhood. And the crucial part — nobody labelled any of this. No human told the model that coffee and tea are related. It came out of arithmetic over fifteen hundred numbers.

This drawing would have two dimensions. Real embeddings have fifteen hundred and thirty-six. You cannot picture that, and you do not need to — the arithmetic of distance works identically no matter how many dimensions there are.


> **Essentials edition — tighter narration:**
>
> Eight ordinary words, embedded with a real model, every pair measured. **One point zero would mean identical.**
>
> Cat to dog: **zero point six.** Cat to kitten: **zero point five seven.** Then a clear drop to the fruit and the drinks.
>
> Now — honestly, **that contradicts the tidy table.** The table said *kitten* should be closest.
>
> The real model puts **dog** first, because cat and dog co-occur in text constantly, while "kitten" is a much narrower word. So do not over-read the ordering **inside** a cluster. And remember that real systems embed paragraphs, not single words.
>
> But look at the bottom two lines, because **that is where the claim holds.** Every group is **tighter inside than outside.**
>
> **That is a neighbourhood — and nobody labelled any of it.**


## Slide 19 — Try it: the neighbourhood map

**Section:** 05 · Interactive


Now you can play with it yourself. These are real vectors — genuine fifteen-hundred-dimension OpenAI embeddings, computed ahead of time and shipped with the slide so it works without an API key.

Click any word and it becomes the probe. Everything re-ranks against it.

On the left, similarity as bars, coloured by category — orange for animals, green for fruit, purple for drinks. On the right, a two-dimensional projection of all fifteen hundred and thirty-six dimensions. That projection throws away most of the information, so treat it as a sketch rather than the truth — but the clustering it shows is real.

[CLICK 'coffee']
Look — tea comes straight to the top. Water is up there too. The animals fall away.

[CLICK 'puppy']
Puppy. Dog first, obviously. Then kitten, then cat. It has learned that puppy-dog and kitten-cat are the same relationship, without anybody telling it what a young animal is.

[CLICK 'lion']
And here is a nice one. Lion sits near cat and elephant but away from dog — it has picked up something about wild versus domestic that we never labelled.

Try a few. The thing I want you to notice is that every ordering you see came out of arithmetic on numbers, and every one of them is defensible. That is what "similar meaning gives similar numbers" actually looks like in practice.


## Slide 20 — The ones you will meet first

**Section:** 06 · Choosing a model


There are many embedding models. These are the ones you will meet first.

Text-embedding-3-small from OpenAI, fifteen hundred and thirty-six dimensions. Cheap, and fine for most projects. That is the one we are using today, and I want you to notice that I am telling you the model and the dimension count in the same breath. That habit will make sense shortly.

Text-embedding-3-large, three thousand and seventy-two dimensions. Better quality, costs more.

Then Voyage, which is strong on technical and code text — worth knowing if you are indexing a codebase. Cohere, good multilingual support. And Mistral, which has open weights if you need to run it yourself.

One genuinely useful thing at the bottom. Most of these models let you request fewer dimensions than the default. If you ask a three-thousand-dimension model for five hundred and twelve dimensions, you cut your storage by a factor of six and typically lose very little accuracy. That is a real lever in production and most people do not know it exists.

Same caveat as the context windows: check current pricing and dimension options in the provider documentation before you commit. These move.

There is a trade-off underneath all of this. More dimensions capture more meaning, and also cost more to compute and more to store. Most production systems reduce dimensions deliberately.


## Slide 21 — The vector database stores both · **essentials**

**Section:** 07 · Where the vectors live


Last box in the ingestion row: the vector database.

A vector database stores embeddings and finds the closest ones to a given vector, fast. That is its specialty — not storing things, but searching them by proximity across a huge number of dimensions.

But here is the detail people miss, and it is the reason I put this table up. Crucially, it stores the original text alongside each vector. Look at the columns: an ID, the vector, the original text, and the source file. One row per chunk.

The vector is how it gets found. The original text is what gets used. If you store only the numbers, you have a beautiful search index and absolutely nothing to send to a language model — because you cannot turn a vector back into English. It is a one-way trip.

The fourth column, source, is metadata. That is what lets you tell a user "this answer came from policy dot pdf, page four". We will watch that column survive all the way through the pipeline.

For options: Pinecone, Weaviate, Chroma, and Qdrant are purpose-built vector databases. We are using Chroma today because it runs locally, on disk, with no account and no server. FAISS is a library from Meta rather than a hosted service. And if you already run Postgres, the pgvector extension turns it into a vector database, which is often the right answer in a real company.


> **Essentials edition — tighter narration:**
>
> Last box in the top row: **the vector database.** It stores embeddings, and it finds the closest ones fast.
>
> But the detail people miss is right there in the table. **It stores the original text alongside every vector.**
>
> The vector is **how a chunk gets found.** The original text is **what actually gets used.**
>
> Store only the numbers, and you have a beautiful index and **nothing to send a model** — because you cannot turn a vector back into English.
>
> That fourth column, the source, is **metadata**. And that is what lets you tell a user **which file an answer came from.**
>
> If you are wondering about options: Pinecone, Weaviate, Chroma, Qdrant. We use **Chroma** here because it runs locally with no account. And if you already run Postgres, **pgvector** is often the right answer.


## Slide 22 — Retrieval, in principle · **essentials**

**Section:** Part three


Part three. Retrieval, in principle.

We have walked the whole top row of the diagram now — documents, chunks, embedding model, vectors, database. Ingestion is finished. And I want to stress that word finished, because it is genuinely done: nothing in that top row runs again until your documents change.

Now someone asks a question. This is the bottom row.


> **Essentials edition — tighter narration:**
>
> Part three. **Retrieval.**
>
> All of that was preparation. **Nothing so far has actually answered a question.**


## Slide 23 — The question takes the same road · **essentials**

**Section:** 08 · Retrieval, step by step


Here is the whole retrieval pipeline in four steps.

Step one. The question goes through the same embedding model the documents went through. Same model. I am going to keep repeating that until it is annoying, because it is the thing that breaks.

Step two. It comes out as a vector of the same length — fifteen hundred and thirty-six numbers, exactly like every chunk in the database.

Step three. The retriever compares that one vector against every stored vector. Conceptually every one; in practice the database uses an index to avoid a brute-force scan, but the effect is the same.

Step four. It ranks them by closeness and returns the top k.

Look at the example. This one is drawn, not run — it says so at the top — because I want a tidy invented company here rather than five Wikipedia articles. The point is easier to see.

The question is "what were our sales in the first quarter". It becomes a vector. And then every chunk gets a score. Q1 revenue reached four point two million: zero point nine one. Quarterly sales by region: zero point eight eight. Revenue targets for the first quarter: zero point eight four. Those three go to the model.

And then look at what did not make it. Annual headcount summary at zero point four two — related to business, not to the question. Refunds at zero point three one. Guest wifi at zero point one nine, which is about as unrelated as it gets.

Notice something about that top result. The question says "sales". The winning chunk says "revenue". Those are different words. A keyword search for "sales" would have missed it entirely. That is what embeddings buy you — matching on meaning rather than on spelling.

How closeness is actually calculated is a later topic. For now: it is distance between two points, measured with arithmetic.


> **Essentials edition — tighter narration:**
>
> A question arrives, and **it takes the same road the documents took.**
>
> It goes through **the same embedding model** — and I am going to keep repeating that — and it becomes a vector of the same length.
>
> The retriever then scores **every stored vector** by closeness, and returns the top matches.
>
> How many come back is called **top k**. That is the last word worth collecting, and **you choose it.**
>
> But here is the half that people miss. **Ask for five and you get five — whether or not any of them are any good.**
>
> **A retriever has no concept of "nothing here fits."** It always returns k results, neatly ranked.
>
> And notice the winning chunk says **"revenue"** while the question says **"sales."** Different words entirely. A keyword search misses that. **Matching on meaning is what embeddings buy you.**


## Slide 24 — You choose how many come back · **short**

**Section:** 08 · Top k


The number of chunks that come back is called top k. That is the last of the words worth collecting. You choose it. Ask for the top five and you get five results.

And now the important half of that sentence: whether or not all five are any good.

A retriever always returns something. It has no concept of "there is no good match here". If your entire corpus contains nothing relevant to the question, you still get k results back, neatly ranked, looking perfectly respectable. They are simply the least-bad of a bad set.

This catches people out constantly. Somebody builds their first RAG system, asks it a question the documents genuinely do not answer, gets five confident-looking chunks back, and concludes the retriever is broken. It is not broken. That is the expected shape of the output.

So if a retriever returns ten chunks and four are irrelevant — that is normal. Filtering on a score threshold, or re-ranking, is how you handle it, and that is a later topic in the track. But knowing that it happens is not a later topic. That is today.


> **Essentials edition — tighter narration:**
>
> One more beat on top k, because this is the thing that catches people building their first system.
>
> They ask something the documents genuinely do not answer, get five confident-looking chunks back, and conclude the retriever is broken. It is not. Ten chunks of which four are irrelevant is the expected shape of the output, not a bug. They are the least-bad of a bad set, and they look exactly like good ones.
>
> What you do about it — filter on a score threshold, or re-rank — is a later topic. Knowing that it happens is not.


## Slide 25 — Vectors find. Text is what gets sent.

**Section:** 08 · The step everyone misreads


This is the step everyone misreads, so I am giving it its own slide.

There is a very common mental model in which the vectors somehow go to the language model — as if the LLM understands embeddings, or as if the numbers are a compressed form the model can read. That is wrong, and it is worth killing off explicitly.

What is sent to the model: the user's question, and the original English text of the top chunks. That is it.

What is not sent: the vectors. Anything numeric at all.

Vectors are only used for finding. Their job is over the instant the matching is done. After retrieval you are back in plain English, and the prompt that reaches the model is the question plus a few paragraphs of perfectly ordinary text — the kind of thing you could have pasted in by hand.

Once that clicks, a lot of RAG stops being mysterious. The clever part is the search. The prompt at the end is boring, and it is meant to be. We are going to print that exact prompt to the screen later so you can read every character of it.

Right. That is all the theory. Let's build it.


## Slide 26 — Build the ingestion pipeline · **essentials**

**Section:** Part four


Part four. Now we build it.

Everything up to here has been the top half of the diagram explained. Now it is the top half of the diagram in code.

Five Wikipedia articles go in. A searchable vector database comes out. About sixty lines of Python and one API key. Budget sixty to ninety minutes if you are typing along, and well under a cent in embedding costs.

By the end of this you will have a folder on disk holding the vector representation of every paragraph in your documents.


> **Essentials edition — tighter narration:**
>
> Part four. That is the theory — **now let us follow five real articles all the way through it.**
>
> Text in one end. **A searchable database out the other.**
>
> **Three steps.** Read the documents in. Cut them up. Turn the pieces into numbers and file them away.
>
> And at each step I am going to show you what actually comes out, because **the numbers are more interesting than the diagram.**


## Slide 27 — You are here

**Section:** 00 · Where this sits


Orienting you before we start typing. This is the same two-row diagram, with the concrete numbers for today filled in.

Five text files in a docs folder. They become five hundred and forty-seven chunks. Those go through OpenAI's embedding model and become five hundred and forty-seven vectors, which land in a Chroma database on disk.

The bottom row — question, embed, retrieve, build a prompt, answer — is the next lesson. We will touch it briefly at the end today just to prove the database works, but building it properly is next time.

And again: ingestion runs once. When we finish, you will not run this code again unless your documents change. That is worth internalising because it shapes how you think about cost. The expensive step happens once, up front, and every question after that is cheap.


## Slide 28 — The project

**Section:** 01 · Set up


Make a folder, open it in your editor, and create one file. The layout is simple: ingestion pipeline dot py, where all the code goes. A dot-env file for your API key. A docs folder for your source documents. And a venv folder which we are about to create.

A virtual environment keeps this project's packages separate from everything else on your machine. Create it with python three dash m venv venv, then activate it with source venv slash bin slash activate. On Windows that second command is venv backslash Scripts backslash activate.

Now — check this before you go any further. The venv prefix on your prompt is how you know it worked. If you do not see that, you are installing into your system Python and nothing below will behave as expected. The single most common failure in this whole lesson is a virtual environment that was created but never activated.

For bigger projects you would reach for Poetry or uv instead. For learning, venv is fine.


## Slide 29 — Five packages, one line

**Section:** 01 · Packages


Five packages, one pip install line.

These map almost exactly onto the boxes in the diagram. Langchain gives us the core abstractions, including the Document object we will meet in a moment. Langchain-text-splitters is the chunking box. Langchain-openai is the embedding model client. Langchain-chroma is the vector database. And python-dotenv is the one that is not in the diagram — it reads your API key out of a file so you never type a secret into your source code.

Now, the interesting one is the package that is *not* on this list.

Almost every RAG tutorial you will find — including the written version of this lesson — installs langchain-community, because that is where DirectoryLoader lives. That package was archived in May twenty twenty-six. LangChain version one moved to a model of one package per provider, and community became a legacy compatibility layer.

It still imports today. But I am not going to teach you to build on an archived package, and as you will see in a moment, for reading text files you do not need a loader package at all. That is six lines of Python.

If you are in this repo rather than typing from scratch, there is a requirements dot txt.


## Slide 30 — One secret, in one place · **short**

**Section:** 02 · The API key


The API key. Go to the OpenAI platform, open Settings, then API keys, and create one. Call it something you will recognise later. Copy it immediately — you cannot view it again.

It goes in a file called dot env in the project root, as OPENAI underscore API underscore KEY equals your key. That name has to be exact, because that is the variable the OpenAI client looks for.

Two things to do right now, and I mean now rather than later.

First, add credit. The API is prepaid, and it is completely separate from any ChatGPT subscription you might have. Paying for ChatGPT Plus does not give you API credit — that catches a lot of people. The minimum top-up is around five US dollars. Embedding these five documents costs well under one cent, so that balance will last you months of learning.

Second, add dot env to your gitignore. Do it before your first commit, not after. A leaked API key gets scraped off a public repository within minutes — there are bots doing nothing else. And once it is in your git history, removing it from the working tree does not remove it from the history.

In this repo, dot env is already gitignored and there is a dot env dot example to copy.


> **Essentials edition — tighter narration:**
>
> The API key. Create one on the OpenAI platform, copy it immediately — you cannot view it again — and put it in a file called dot env.
>
> Two things that catch people out, and both are worth doing before you write a line.
>
> Add credit. The API is prepaid and entirely separate from a ChatGPT subscription; paying for Plus gives you no API credit, which catches people constantly. Embedding these five documents costs well under a cent.
>
> And add dot env to your gitignore before your first commit. A leaked key gets scraped off a public repository within minutes, and removing it from the working tree does not remove it from your history.


## Slide 31 — Five articles

**Section:** 03 · The documents  
**Run:** `python3 tools/fetch_docs.py`


You need some documents. Create a docs folder and put five plain text files in it. This walkthrough uses the Wikipedia articles for Google, Microsoft, Nvidia, SpaceX and Tesla, saved as dot txt.

In this repo that is scripted, so anyone who clones it gets exactly the same corpus and therefore roughly the same chunk counts you see on these slides. Let me run it.

[RUN tools/fetch_docs.py]

About three hundred and fifty thousand characters across five files. Tesla is the biggest at ninety-four thousand.

Any five text files will work — use your own if you have something you actually want to ask questions about. Company articles are convenient for teaching because they are long, factual, and full of specific numbers and names you can test the retriever against. When you ask "who founded SpaceX" you know what the right answer is, so you can tell immediately whether retrieval worked.

One detail in that script worth mentioning. Wikipedia's plain-text export separates paragraphs with a single newline. Our splitter is going to split on blank lines. So the script normalises every paragraph onto its own blank-line-separated block. Without that step the splitter finds almost no break points and produces eight-thousand-character chunks, which are useless units of retrieval. That is a real-world data-cleaning step, and it is the kind of thing that quietly ruins a RAG pipeline if you skip it.


## Slide 32 — Imports first, prove it runs

**Section:** 04 · The shell


Open ingestion pipeline dot py and start with this. Imports, two constants, and an empty main.

Each line of that import block maps to one box in the diagram, which is why I want you to type it all at once. Path and Document are how we read the files — a standard-library import and one LangChain class, no loader package. CharacterTextSplitter chunks them. OpenAIEmbeddings turns chunks into vectors. Chroma stores them.

Load dot env is the odd one out — it pulls your key out of the dot env file and into the environment, so the OpenAI client can find it without you ever typing a secret in code.

Now run it. You should see "main function" printed, and nothing else.

That step looks pointless and it is not. It confirms three separate things before you have written any real logic: your virtual environment is active, all five packages installed correctly, and your file has no syntax errors. If something is wrong with your setup, you find out here — in two seconds, with a clear error — rather than forty lines later in the middle of an API call.

Get in the habit. Prove the skeleton runs before you fill it in.


## Slide 33 — Load the files · **essentials**

**Section:** 05 · Step one  
**Run:** `python 04_load.py`


Step one. Load the files. And this is the step where I depart from most tutorials, so let me be explicit about why.

Every RAG tutorial reaches for DirectoryLoader here. Look at what it actually does for a folder of text files: it globs for a pattern, reads each file, and wraps the text in a Document with the path as metadata. That is the whole job. So that is what we write — six lines, using pathlib from the standard library and the Document class.

You get the same objects, you drop an archived dependency, and — more importantly — nothing is hidden. When somebody says "the loader", this is what they mean.

Notice the two guard clauses, and notice they are doing different jobs. The first one checks the directory exists. The second checks we actually loaded something. Without that second check, pointing at an empty folder gives you a pipeline that runs happily all the way through, embeds nothing, stores nothing, and reports success. Fail loudly and early rather than silently loading nothing — that principle will save you more debugging time in RAG than almost anything else, because so much of this stack fails quietly.

Let me run it.

[RUN DEMO 04]


> **Essentials edition — tighter narration:**
>
> Step one: load the files. And here I depart from most tutorials deliberately.
>
> Every RAG tutorial uses DirectoryLoader from langchain-community. That package was archived in May twenty twenty-six. And look at what it actually did for text files: glob a pattern, read each file, wrap the text in a Document with the path as metadata. That is the whole job — so we write it directly, in six lines.
>
> Same objects out, one fewer dead dependency, and nothing hidden behind the word "loader".
>
> Note the two guard clauses. One checks the folder exists; the other checks we actually loaded something. Without the second, an empty folder gives you a pipeline that runs happily, embeds nothing, and reports success.


## Slide 34 — Five files in, five Documents out · **essentials**

**Section:** 05 · What comes back


Here is what comes back. Five files in, five Document objects out.

That Document object shows up everywhere from here on, so learn its two attributes now — there are only two and they are both simple.

Dot page underscore content is the entire text of the file as one long string. Not a list of lines, not a stream. One string — sixty-eight thousand characters for Google, ninety-four thousand for Tesla.

Dot metadata is a dictionary. Right now it holds one key, source, pointing at the file path — we put it there ourselves, which is worth noticing, because it means you can put anything you like in it. You can add your own keys later — page numbers, authors, dates, permissions — and that is how real systems do access control and citation.

And here is the property that makes metadata worth caring about: metadata survives everything. When a document gets chunked in a moment, every single chunk inherits its parent's metadata. That is how a RAG system can tell a user which file an answer came from, even though the thing it retrieved was a four-hundred-character fragment.


> **Essentials edition — tighter narration:**
>
> **Step one. Read the documents in.**
>
> Five files go in, and **five records** come out. And each record has **two halves.**
>
> **The first half is the text itself** — the whole file, as one long run of characters. Sixty-eight thousand of them for Google. Ninety-four thousand for Tesla.
>
> **The second half is where it came from.** Right now that is just the filename — and **we put it there ourselves**, which means you can put anything you like alongside it. Page numbers. Authors. Who is allowed to see it.
>
> **Remember that second half**, because in a moment we are going to cut these five documents into hundreds of pieces — and **every single piece will carry it.**
>
> **That is how a system can tell you which file an answer came from**, when the thing it actually retrieved was a four-hundred-character fragment.
>
> So. Five documents. **Ninety thousand characters each, give or take.** Far too big to be useful. Let us cut them up.


## Slide 35 — Two things worth knowing

**Section:** 05 · Two gotchas


Two things worth knowing.

First, that call to sorted is not decoration. DirectoryLoader walked the directory in whatever order the filesystem handed back — which meant index zero could be a different file on your machine than on mine, and the chunk order changed with it. For a lesson where we compare numbers, that is genuinely annoying. Sorting makes the run reproducible.

But the underlying advice survives either way: never write code that assumes index zero is a particular file. If you need a specific document, filter on the metadata.

Second, text is the easy case. I have just told you that you do not need a loader package, and for dot-txt files that is true. PDFs, spreadsheets and HTML are a different story — those need a real parser, and that is absolutely worth a dependency. Reach for langchain-unstructured, or pypdf directly.

The important part is that what comes out the other side is the same thing: Document objects, with page content and metadata. So everything downstream of this box — chunking, embedding, storing, retrieving — does not change at all.


## Slide 36 — Chunk them · **essentials**

**Section:** 06 · Step two  
**Run:** `python 05_chunk.py`


Step two. Chunk them.

Five documents of sixty to ninety thousand characters each are far too large to be useful units of retrieval. Nobody wants an entire Wikipedia article returned because one sentence in it matched.

Three arguments. Chunk size, chunk overlap — which we will come to in a second, and which is set to zero here deliberately so you can see what goes wrong — and separator, which is set to a blank line so we prefer to break at paragraph boundaries.

Now, the thing I want to flag hardest on this slide. Chunk size equals eight hundred means eight hundred characters. Not eight hundred tokens. Roughly two hundred tokens. Different splitters in different libraries count in different units, and getting this wrong by a factor of four is a very easy mistake to make. Always check which unit you are in.

Let me run it.

[RUN DEMO 05]


> **Essentials edition — tighter narration:**
>
> Step two: chunk them. Articles of sixty thousand characters are useless units of retrieval — nobody wants a whole article back because one sentence matched.
>
> Three arguments: chunk size, chunk overlap, and a separator set to a blank line so we prefer paragraph boundaries.
>
> And the thing to flag hardest: chunk size of eight hundred means eight hundred characters, not tokens. Roughly two hundred tokens. Different splitters count in different units, and getting that wrong by a factor of four is easy.
>
> You will also see the chunks are not all eight hundred. The splitter cuts on the separator first, then merges up to the target — it never breaks a paragraph to hit the number. So it is a target, not a cap.


## Slide 37 — 800 is a target, not a cap · **essentials**

**Section:** 06 · The result


Five hundred and thirty-nine chunks, from five documents.

Now look at the spread, because this is where the mental model needs correcting. The smallest chunk is fifteen characters. The largest is one thousand seven hundred and nineteen. The average is six hundred and forty-three. We asked for eight hundred and got almost nothing that is actually eight hundred.

Seventy-nine of the five hundred and thirty-nine came out longer than the target.

Here is why. CharacterTextSplitter splits on the separator first — blank lines, in our case — and then merges the resulting pieces back together up to chunk size. What it will not do is break a paragraph in half to hit the number. So if a single paragraph is seventeen hundred characters, you get a seventeen-hundred-character chunk, and LangChain logs a warning for each one.

Those warnings are warnings, not errors. I have suppressed them in the demo and counted them instead, because otherwise seventy-nine lines scroll past and you cannot see anything else. But you will see them if you write this yourself, and now you know they are expected.

Chunk size is a target, not a hard cap. RecursiveCharacterTextSplitter handles this better — it tries a sequence of separators, falling back to smaller ones — and it is what you would reach for in a real project. We are staying on the simple one today so that the mechanics stay visible.


> **Essentials edition — tighter narration:**
>
> **Step two. Cut them up.**
>
> I have asked for chunks of eight hundred characters, and **with overlap switched off for the moment** — I will come back to that in a second.
>
> Five documents in, **five hundred and thirty-nine chunks** out.
>
> Now look at the spread, because **this is where the mental model is usually wrong.**
>
> Smallest: **fifteen characters.** Largest: **seventeen hundred.** Average: **six hundred and forty-three.** We asked for eight hundred, and got almost nothing that is actually eight hundred.
>
> Here is why. The splitter **breaks on blank lines first**, and then glues the pieces back up towards your target.
>
> **What it will never do is cut a paragraph in half to hit the number.** So a long paragraph gives you a long chunk.
>
> **Chunk size is a target, not a cap.**
>
> Now — about that overlap setting I switched off. **It is the one that decides whether this whole system actually works.** Let me show you why.


## Slide 38 — What chunk_overlap actually does · **essentials**

**Section:** 06 · Overlap


This is the part of demo five I actually care about, and it is shown on a short passage with a small chunk size so the whole thing fits on one screen. The mechanism is identical at eight hundred characters.

Top block, overlap zero. Read the seam between chunk zero and chunk one. Chunk zero ends with "its name is a tribute to the". Chunk one begins with "inventor Nikola Tesla". The sentence is cut clean in half.

Think about what that costs you. Neither half carries the whole fact. If someone asks "who is Tesla named after", chunk zero has the question's subject but not the answer, and chunk one has the answer but has lost the subject. Neither one is a good match. The fact is in your database and it is unreachable.

Bottom block, overlap forty. Now chunk one begins by repeating the tail of chunk zero — "Motors, its name is a tribute to the" — and then continues into "inventor Nikola Tesla". The sentence on the seam survives intact inside one chunk. It is retrievable again.

That is all overlap does. Each chunk repeats the last n characters of the one before it.

Rule of thumb: set overlap to roughly ten to twenty percent of chunk size. For eight hundred characters, one hundred is a reasonable default. You pay for that duplication in storage and in embedding cost — the same text gets embedded twice — and it is almost always worth it.

So we change the default to a hundred, and re-run.


> **Essentials edition — tighter narration:**
>
> Here is the same splitter on a small piece of the Tesla article, blown up so you can read the seam.
>
> **Overlap zero — that is what produced the five hundred and thirty-nine chunks a moment ago.** Look at the seam. **A sentence is cut clean in half.**
>
> And here is the consequence. Neither half carries the whole fact, so neither one is a good match for a question about it. **The fact is sitting in your database, and it is unreachable.**
>
> **Now overlap forty.** Chunk one begins by repeating the tail of chunk zero — so **the sentence on the seam survives intact somewhere.**
>
> And that is all overlap does. Each chunk repeats the last n characters of the one before it.
>
> Rule of thumb: **ten to twenty percent of your chunk size.** These example chunks are small, so forty characters is enough to show it. **On the real run I use a hundred**, against a chunk size of eight hundred.
>
> **And that is what takes us from five hundred and thirty-nine chunks to five hundred and forty-seven.** Eight extra pieces, because the seams now repeat a little text. **That is the whole price** — a bit more storage, a few more embedding calls — and it is almost always worth paying.


## Slide 39 — Try it: watch the chunks re-cut · **short**

**Section:** 06 · Interactive


This is the same two numbers you just saw in code, except now you can move them and watch what they cost you.

The document is the opening of the Tesla article — the same text demo five used.

[DRAG chunk_size DOWN TO ~150]
Small chunks. Look at the count climbing and the average dropping. These are precise — each one is about a single thing — but read them. They have lost their surroundings. A chunk that says "in 2008 he was named chief executive officer" does not say who "he" is. Retrieve that on its own and it is useless.

[DRAG chunk_size UP TO ~1200]
Now large chunks. Only a couple of them. Each one carries plenty of context — but now a question about the Roadster matches a chunk that is mostly about something else, and you are sending three times as many tokens to answer it. The match gets diluted.

[DRAG chunk_overlap UP TO ~100]
Now watch the highlight. That green text at the start of each chunk is repeated from the one before it. Look at the "duplicated" figure climbing — that is text you are storing twice and paying to embed twice.

[SET overlap TO 0, THEN BACK TO 100]
And that is the trade. At zero you pay nothing extra and sentences on the seam get cut in half. At a hundred you pay maybe fifteen percent more and they survive.

There is no correct answer on this slide. There is a shape of answer: chunks big enough to stand alone, small enough to be about one thing, with enough overlap that the seams do not eat your sentences.


> **Essentials edition — tighter narration:**
>
> Same two numbers you just saw in code, except now you can move them.
>
> Drag chunk size down and the count climbs while the average drops. These are precise, but read them — they have lost their surroundings. A chunk saying "in 2008 he was named chief executive" does not say who "he" is.
>
> Drag it up and each chunk carries plenty of context, but a question about one detail now matches a chunk that is mostly about something else, and you send three times the tokens.
>
> Then drag the overlap up and watch the highlight: that repeated text is what you are storing and paying to embed twice.
>
> There is no correct answer here — only a shape. Big enough to stand alone, small enough to be about one thing.


## Slide 40 — Embed and store — one call does both · **essentials**

**Section:** 07 · Step three  
**Run:** `python 06_embed_store.py`


Step three. Embed and store.

These are two conceptual steps — two separate boxes in the diagram — and one line of code. Chroma dot from underscore documents embeds every chunk and writes the results to disk in a single call. It is doing a lot more than it looks like it is doing.

This is also the one step in the whole pipeline that costs money and takes real time. Every chunk is a call to OpenAI. For five hundred and forty-seven chunks, expect thirty seconds to a couple of minutes.

One thing about the demo script as opposed to the lesson file: my demo caches the embeddings on disk, keyed by the text and the model. The vectors are completely real — it is calling the actual API — but if I run this demo a second time while rehearsing, it does not pay twice. The finished ingestion pipeline dot py in the repo has no caching; it is the plain version from the lesson.

Let me run it.

[RUN DEMO 06]


> **Essentials edition — tighter narration:**
>
> Step three: embed and store. Two conceptual boxes, one line of code — Chroma dot from underscore documents embeds every chunk and writes it to disk in a single call.
>
> This is also the only step that costs money and takes time. Every chunk is an API call. Five hundred and forty-seven chunks, thirty seconds to a couple of minutes, a fraction of a cent.
>
> Three arguments matter. The embedding model — write that choice down, because the next lesson must use exactly the same one. Persist directory, or Chroma runs in memory and everything vanishes when the script ends. And cosine as the distance measure, which is the standard for text.
>
> Look at what is stored per chunk: the vector, the original text, and the metadata — the source surviving all the way from the loader.


## Slide 41 — One row per chunk · **essentials**

**Section:** 07 · What landed on disk


Five hundred and forty-seven vectors stored. And a folder has appeared that was not there a moment ago.

Look at what is stored per chunk, because this is the vector database table from earlier, now real. The vector: fifteen hundred and thirty-six numbers. The original text: the opening of the Google article. And the metadata: source, docs slash google dot txt.

There is the metadata surviving, exactly as promised. It went in at the loader, came through the splitter untouched, and is now sitting in the database attached to a chunk.

Underneath, the folder structure. Chroma dot sqlite three holds the text, the metadata and the ids — it is an ordinary SQLite database, you can open it. And then a folder named after the collection's UUID holds the binary files: data level zero dot bin is the vectors themselves, and link lists dot bin is the search index, which is what makes proximity search fast rather than a brute-force scan of half a million numbers.

And the line to remember: the original text is not optional. Without it you have numbers and nothing to send an LLM. That is why this database stores both.


> **Essentials edition — tighter narration:**
>
> **Step three. Turn those five hundred and forty-seven chunks into numbers, and file them away.**
>
> And those two things happen together, in one pass — the embedding and the storing.
>
> **Five hundred and forty-seven vectors** on disk.
>
> Now look at what is kept for each one, because **this is that vector database table from earlier — now real.**
>
> **The vector:** fifteen hundred and thirty-six numbers. **The original text.** And **the source**, still saying docs slash google dot txt.
>
> **There it is** — the thing I asked you to remember two slides ago. It went in at the loader, came through the splitter untouched, and it is now sitting in the database attached to a chunk.
>
> And the line to leave with: **the original text is not optional.** Without it you have numbers, and nothing to send a model.
>
> **That is the ingestion pipeline finished.** Five articles went in; five hundred and forty-seven searchable vectors came out. **So let us ask it something.**


## Slide 42 — The three arguments that matter · **short**

**Section:** 07 · The three arguments


Three arguments in that call matter, and each one has a failure mode attached to it.

Embedding is the model. We are using text-embedding-3-small, which returns fifteen hundred and thirty-six dimensions. Write that choice down. I am serious about that — write it in a comment, put it in your README. Next lesson you must embed the user's question with exactly the same model, or retrieval returns nonsense with no error message. That is the whole finale of today.

Persist directory is where the database lives on disk. Leave it out and Chroma runs in memory only, which means everything disappears when the script ends and you pay to embed all over again. It is a quietly expensive mistake — the code looks like it worked, it printed success, and there is simply nothing on disk.

Collection metadata, hnsw colon space, cosine. That sets the distance measure used to compare vectors. Cosine similarity is the standard choice for text, because it measures the angle between two vectors rather than their magnitude — which means a long document and a short one about the same topic still score as similar. Set it and move on; how it works is a later topic.

HNSW, by the way, stands for hierarchical navigable small world, which is the indexing algorithm. That is the thing making the search fast.


> **Essentials edition — tighter narration:**
>
> Three arguments matter here, and each has a failure attached.
>
> The embedding model. Write that choice down — the query side must use exactly the same one, and that is the finale of this lesson.
>
> Persist directory. Leave it out and Chroma runs in memory: everything vanishes when the script ends, and you pay to embed again. The code looks like it worked, printed success, and there is simply nothing on disk.
>
> And the distance measure, cosine, which is the standard for text because it compares the angle rather than the magnitude — so a long document and a short one about the same topic still score as similar.


## Slide 43 — Ask it something · **essentials**

**Section:** 08 · Confirm it worked  
**Run:** `python 07_query.py "Who founded SpaceX?"`


Let's confirm it worked. This is the top of the next lesson really, but we need to prove the store is queryable.

[RUN DEMO 07]

The question is "who founded SpaceX". The collection has five hundred and forty-seven vectors in it, covering five different companies.

And every single result comes from spacex dot txt. Not one Tesla chunk, not one Microsoft chunk, despite Elon Musk appearing prominently in the Tesla article — which is exactly the kind of near-miss that would trip a keyword search.

Look at the top hit: "In early 2002, Elon Musk started to look for staff for his company, soon to be named SpaceX." That answers the question. Score zero point six six two.

If your results come back from the right file, your ingestion pipeline is finished and correct. That is the test.

One thing to note about the scores. Zero point six six is the top match, and that might feel low if you were expecting something near one. It is not low. Cosine similarity between a short question and a long paragraph rarely goes above zero point seven, because they are different shapes of text. What matters is the gap between the top results and everything else, not the absolute number. Do not go hunting for a universal threshold — calibrate against your own corpus.


> **Essentials edition — tighter narration:**
>
> The store has **five hundred and forty-seven vectors** covering five companies. And the question is **"who founded SpaceX."**
>
> **Every single result comes from spacex dot txt.**
>
> **Not one Tesla chunk** — despite Elon Musk appearing all over the Tesla article. That is exactly the near-miss that would trip a keyword search.
>
> One note on the scores, because I know what you are thinking. **Zero point six six** is the top match, and that might feel low. **It is not.**
>
> Cosine similarity between a short question and a long paragraph **rarely exceeds zero point seven.**
>
> **What matters is the gap between the top results and the rest** — not the absolute number.
>
> But the retrieved chunks are not the answer. **They are what gets sent.** So let us look at exactly what reaches the model.


## Slide 44 — This is what reaches the model · **essentials**

**Section:** 08 · The actual prompt


And here it is. The actual prompt. Every character of it, printed by the demo.

I promised earlier we would look at this, because it is the step everyone misreads. Read what is on that screen. An instruction: "answer the question using only the context below." Then the word CONTEXT, and then three paragraphs of completely ordinary English lifted straight out of the Wikipedia article. Then the word QUESTION, and the user's question.

That is it. That is the whole thing. Just under three thousand characters.

There is nothing numeric anywhere in it. No vectors, no embeddings, no similarity scores. The model has no idea a vector database was involved. As far as it is concerned, somebody pasted three paragraphs and asked a question.

Vectors are only used for finding. Their job finished the moment the matching was done, and then we went back to plain English.

I think this is the single most clarifying thing in the whole lesson. All the machinery — the chunking, the embedding, the fifteen hundred dimensions, the HNSW index — exists to produce those three paragraphs. The clever part is the search. The prompt at the end is boring, and it is supposed to be.


> **Essentials edition — tighter narration:**
>
> And here is **the prompt.** Every character of it.
>
> An instruction. The word CONTEXT. **Three paragraphs of ordinary English** lifted straight out of the article. And the question. Just under three thousand characters.
>
> Now notice what is **not** in it. **There is nothing numeric here.** No vectors. No embeddings. No scores. **The model has no idea a vector database was ever involved.**
>
> And this is the step everybody misreads. **Vectors are only used for finding.** Their job ends the instant the matching is done — and then you are back in plain English.
>
> All of the machinery — the chunking, the embeddings, the fifteen hundred dimensions — **exists to produce those three paragraphs.**
>
> **The prompt at the end is boring. And it is meant to be.**
>
> So — **that is a complete, working system, end to end.** Documents in, a real answer out, with sources. Which makes this exactly the right moment to show you **the one way it falls apart without telling you.**


## Slide 45 — Try it: ask, and watch the prompt build

**Section:** 08 · Interactive


Last interactive one, and it puts the whole retrieval pipeline in your hands.

Small policy document, cut into chunks. Type a question, and every chunk gets scored against it. The highlighted ones are the ones that would be sent.

One honesty note before I start clicking. The four preset questions were embedded ahead of time with the real model, so those scores are genuine cosine similarity over fifteen hundred dimensions. If you type your own question, the page cannot embed it — that needs an API call — so it falls back to a rough local measure. The panel tells you which one you are looking at, and you should watch that label.

[CLICK 'laptop budget']
Watch the ranking jump. The equipment chunk goes to the top and the prompt underneath rebuilds itself in real time.

[DRAG top k FROM 2 TO 6]
Now raise top k. More chunks get highlighted, and watch the "sent to model" figure climb — by six it reads a hundred percent. Every part of the document is in the prompt. That is the failure mode of a large k: you have reinvented pasting the whole thing in.

[SET top k BACK TO 2, CLICK 'what is the capital of France']
And here is the one I really want you to see. That question is not answerable from this document at all — there is nothing about France anywhere in it.

Look at the top score: zero point one three six, against zero point six seven for the annual leave question. These are real embeddings, so that collapse is real. And the panel underneath flags it: nothing here really answers that.

But now look at the chunk list. You still got two results back. Highlighted. Neatly ranked. Ready to send.

That is the point from earlier, made concrete. A retriever always returns k results. It has no concept of "I do not know". If you hand those two chunks to a language model with no score threshold, it will do its best with irrelevant text — and that is where a large share of RAG hallucinations actually come from.


## Slide 46 — Run it twice, pay twice

**Section:** 08 · The re-run trap  
**Run:** `python 06_embed_store.py --append`


One trap before we move on, and it is a trap I have watched people fall into more than once.

From documents adds to an existing collection. It does not replace it. So if you run your ingestion script twice — which you will, because you will tweak the chunk size and re-run — you end up with one thousand and ninety-four vectors, half of them exact duplicates. And you paid to embed all of them twice.

The symptom is subtle rather than dramatic. Retrieval still works. But your top-k results start coming back as pairs of identical chunks, so asking for five results gets you two or three distinct pieces of information instead of five. Your context is half wasted and the quality quietly drops.

While you are experimenting, delete the db_chroma folder before each run. My demo script does that by default for exactly this reason — and the dash dash append flag opts back in to the mistake, so you can watch the count double if you want to see it.

In production you would use a proper upsert with stable document IDs, so re-ingesting updates a chunk instead of duplicating it. But for learning, delete the folder.


## Slide 47 — The mistake that breaks most first builds · **essentials**

**Section:** Part five


Part five. And this is the one I most want you to leave with.

The mistake that breaks most first RAG builds. I have been foreshadowing it all session — the two orange boxes in the diagram, "write that choice down", "the same model, every time".

Here is what makes it dangerous. Nothing crashes. There is no error message. Let me show you the rule, and then we will break it on purpose.


> **Essentials edition — tighter narration:**
>
> Part five — and **this is the one to leave with.**
>
> Everything else that goes wrong in this stack **tells you.**
>
> **This one does not.**


## Slide 48 — The consistency rule · **essentials**

**Section:** 09 · The consistency rule


The consistency rule. Use the same embedding model and the same dimension count for your documents and for your queries. Every time. No exceptions.

The scenario that produces the failure is completely ordinary. You embed your documents in January with one model. Two months later you come back, you are writing the query side, and you reach for a model — maybe a cheaper one, maybe you just do not remember which you used. Different model. Now your documents and your questions are in two different systems.

The way to hold this in your head: think of embedding models as separate languages. A vector written by one model means nothing to another. The numbers are the same shape, they are in the same range, they look completely normal — and they encode meaning in a totally different arrangement.

The two systems cannot understand each other. And neither one will tell you.

Let's break it and watch.


> **Essentials edition — tighter narration:**
>
> Here is the rule. **Use the same embedding model, and the same dimension count, for your documents and for your queries.** Every time. No exceptions.
>
> I have been foreshadowing this all the way through. **The two orange boxes** on the diagram — the same model in both rows. And when the question took the same road as the documents, I said I would **keep repeating it.** This is why.
>
> And the way it goes wrong is **completely ordinary.** You embed your documents in January. Two months later you write the query side, and you reach for a model — maybe a cheaper one, maybe you just do not remember which one you used.
>
> Think of embedding models as **separate languages.** **A vector written by one means nothing at all to another.**
>
> And here is the sting. The numbers are the same shape. The same range. They look entirely normal. **And neither system will tell you.**


## Slide 49 — Same store. Same question. Nothing crashes. · **essentials**

**Section:** 09 · Break it on purpose  
**Run:** `python 08_model_mismatch.py`


Demo eight. This builds a store the right way, then queries it the wrong way.

One detail so you know this is a fair test. The wrong model is text-embedding-3-large, but I have asked it for fifteen hundred and thirty-six dimensions instead of its default three thousand. So the vector is exactly the same shape as the ones in the database. Chroma has no dimension mismatch to complain about. It has no way whatsoever to know it is being handed a different language.

[RUN DEMO 08]

Top block, the right model. Zero point six six, zero point six three, zero point six three. All from spacex dot txt. That is our known-good result from a few minutes ago.

Bottom block. Same database. Same question. Same number of results. The only thing that changed is which model embedded the question.

Look at the scores. Zero point zero six four. Zero point zero five five. Zero point zero five two. They have collapsed by a factor of ten — the retriever is finding nothing it considers a good match, because every stored vector is effectively noise to it now.

And look at the third result. Microsoft dot txt. "Microsoft became the third publicly traded U.S. company..." — returned as a top-three answer to "who founded SpaceX".

Now notice what did not happen. Nothing crashed. No exception. No warning. No log line. The retriever returned exactly three results, ranked, formatted identically to the correct run. If you were not printing the source filenames — and most people do not, in a first build — this looks completely healthy.

And then an LLM takes those three chunks and writes a fluent, confident, sourced-looking, wrong answer.

That is why this is the mistake that breaks most first builds. Not because it is subtle to fix, but because it is invisible until someone checks an answer by hand.


> **Essentials edition — tighter narration:**
>
> So let us **break it on purpose.**
>
> And let us make it a fair test. The wrong model is asked for **the same fifteen hundred and thirty-six dimensions**, so the vector is **exactly the same shape.** The database has nothing to complain about.
>
> **Top block, the right model:** all three results from spacex dot txt.
>
> **Bottom block** — same database, same question. **Only the model that embedded the question changed.**
>
> **The scores collapsed by a factor of ten.** And the third result is from **microsoft dot txt**, returned for a question about SpaceX.
>
> Now notice **what did not happen.**
>
> **Nothing crashed.** No exception. No warning. No log line. Three results, ranked, formatted identically to the correct run.
>
> **Every piece of monitoring you have says the system is fine** — and a model handed those chunks writes a confident, wrong answer.
>
> And that is why this breaks first builds. Not because it is hard to fix — **because it is invisible until somebody checks an answer by hand.**


## Slide 50 — Try it: flip the model, break the system · **short**

**Section:** 09 · Interactive


And finally, the failure, as a switch you can flip.

The documents on the left were embedded once, correctly, with text-embedding-3-small. The only thing this toggle changes is which model embeds the question.

[CLICK 'SAME model']
Same model. Top score zero point five five, and the right answer — Q1 revenue reached four point two million — is clearly first. Healthy.

[CLICK 'DIFFERENT model']
Different model. Same store, same question, same six facts.

Top score, zero point zero two six. The signal has collapsed by a factor of twenty. The ordering is now essentially arbitrary — on six facts it happens to keep the right one near the top, which is exactly why this is so dangerous on a small test set. In demo eight, on five hundred and forty-seven real chunks, this same flip returned a Microsoft paragraph for a question about SpaceX.

And now look at the bottom-right number, which is the whole point of this slide.

Errors raised: zero.

Not one exception. Not one warning. The retriever returned six results, ranked, formatted identically. Every piece of monitoring you have says the system is fine.

[FLIP BACK AND FORTH A FEW TIMES]
This is what a silent failure looks like. The difference between a working RAG system and a broken one, from the outside, is a number getting smaller. Nothing else changes.

That is why the rule is absolute. One embedding model, one dimension count, everywhere.


> **Essentials edition — tighter narration:**
>
> And here is the failure as a switch you can flip.
>
> The documents were embedded once, correctly. The only thing this toggle changes is which model embeds the question.
>
> Same model: top score around zero point five five, and the right answer clearly first.
>
> Different model: same store, same question, same six facts — and the top score collapses to zero point zero two six. On six facts it happens to keep the right one near the top, which is exactly why this is so dangerous on a small test set. On five hundred chunks it returns a Microsoft paragraph for a question about SpaceX.
>
> Now look at the errors-raised number. Zero. That is what a silent failure looks like.


## Slide 51 — What this means in practice · **short**

**Section:** 09 · In practice


So what does that mean in practice? Four rules.

One. Choose your embedding model before you ingest a single document. This is an architectural decision, not an implementation detail you get to defer.

Two. Choose your dimension count at the same time, and write it down. In the README, in a config file, in a comment at the top of the script. Somewhere your future self will actually look.

Three. If you switch model later, you re-embed the entire corpus. There is no partial migration. You cannot have half your documents in the new model and half in the old, because they cannot be compared. For a large corpus that is a real cost, which is why rule one matters.

Four, and this one catches people who think they are being careful: changing dimensions within the same model breaks it too. Text-embedding-3-large at three thousand and text-embedding-3-large at fifteen hundred are not compatible with each other. Same model, different language.

And then a suggestion that is not in the lesson but which I would put in any real build. Store the model name and the dimension count in the collection metadata when you create the store, and assert on them when you query. That is about ten lines of code, and it converts this entire category of silent failure into a loud one that fails on the first query. Given what we just watched, that is an extremely good trade.


> **Essentials edition — tighter narration:**
>
> So what does that mean in practice? Four rules.
>
> Choose your embedding model before you ingest a single document. This is architecture, not an implementation detail you defer.
>
> Choose the dimension count at the same time and write it down somewhere your future self will look.
>
> If you switch model later, you re-embed everything. There is no partial migration — you cannot have half your corpus in each, because they cannot be compared.
>
> And this one catches the careful: changing dimensions within the same model breaks it too. Same model, different language.
>
> One suggestion not in the lesson: store the model name and dimension count in the collection metadata and assert on it when you query. Ten lines that turn a silent failure into a loud one.


## Slide 52 — When it does not run

**Section:** 10 · When it does not run


The five things that go wrong, and what each one actually means.

OpenAI error, api key must be set. That is no dot env file, or the wrong variable name, or you forgot to call load dot env. The name has to be exactly OPENAI underscore API underscore KEY.

Rate limit error, quota exceeded. This one is badly named and sends people down the wrong path. It is not a rate limit. Your key works fine — the account simply has no credit. Add funds in Billing. If you are sitting there adding retry logic and backoff, you are solving a problem you do not have.

Module not found error. Your virtual environment is not active, or you installed into a different one. Check for the venv prefix in your prompt. This is the one that comes back to bite people who open a new terminal tab and forget to re-activate.

No dot txt files found. You are running the script from a different directory than the one holding docs. Relative paths are relative to where you launched python, not to where the file lives.

And created a chunk of size N longer than eight hundred. That is a warning, not an error. A single paragraph exceeded the target. Expected behaviour, as we saw. Nothing to fix.


## Slide 53 — Check yourself

**Section:** 10 · Check yourself


Before you move on, check yourself against these. If you are watching a recording of this, pause here — genuinely try to answer them out loud before reading on.

One. Why does a two million token window not remove the need for RAG? Two reasons: scale, because real corpora are orders of magnitude larger; and cost and quality, because sending irrelevant context is expensive, slow, and produces worse answers.

Two. Four million tokens at a chunk size of five hundred. Eight thousand chunks, and eight thousand vectors. One vector per chunk, always.

Three. Ten chunks back, four irrelevant. Not broken. A retriever always returns k results whether or not they are any good.

Four. What is in the prompt? The user's question and the original English text of the top chunks. Never the vectors.

Five. Which Document attribute survives chunking? Metadata. Every chunk inherits its parent's.

Six. Chunk size counts characters, not tokens.

Seven. Leave out persist directory and Chroma runs in memory — everything vanishes when the script ends and you pay to embed again.

Eight. Documents with model A, queries with model B. The symptom is that there is no symptom. No error, collapsed scores, and confidently wrong chunks.


## Slide 54 — The whole session in ten lines · **essentials**

**Section:** 10 · Summary


The whole session in ten lines. This is your revision card.

Models have a token limit, and real document stores are millions of times larger. So you retrieve the relevant pieces instead of sending everything.

A RAG system is two pipelines. Ingestion runs once. Retrieval runs per question.

Ingestion: cut documents into chunks, embed each chunk, store the vectors with their text.

An embedding is a fixed-length list of numbers where similar meaning gives similar numbers.

A vector database stores those numbers and searches them fast.

Retrieval: embed the question the same way, rank stored vectors by closeness, take the top k.

Send the model the question plus the original text of those chunks. Never the vectors.

Set chunk overlap so sentences on the seam survive, and set persist directory or you lose the work.

And the last one, which is the one that will actually cost you an afternoon: one embedding model, one dimension count, everywhere. Breaking this fails silently.


> **Essentials edition — tighter narration:**
>
> **The whole lesson, on one slide.** This is your revision card.
>
> Models have a token limit, and real document stores are **millions of times larger.** So you **retrieve the relevant pieces** instead of sending everything.
>
> A RAG system is **two pipelines** — ingestion runs once, retrieval runs on every question.
>
> **Ingestion:** chunk, embed, and store the vectors **with their text.**
>
> An embedding is a **fixed-length list of numbers**, where **similar meaning gives similar numbers.**
>
> **Retrieval:** embed the question **the same way**, rank by closeness, and take the top k.
>
> Send the model the question plus **the original text** — never the vectors.
>
> Overlap your chunks so sentences on the seam survive. And tell the database where to save, or the work is gone when the process ends.
>
> And the one that will actually cost you an afternoon: **one embedding model, one dimension count, everywhere. Breaking that fails silently.**


## Slide 55 — Next: the retrieval pipeline · **essentials**


That is the ingestion pipeline. You have a folder on disk holding the vector representation of every paragraph in five documents — five hundred and forty-seven of them, searchable, each one carrying the file it came from.

And you have locked in a decision: text-embedding-3-small at fifteen hundred and thirty-six dimensions. That choice now applies to the whole project.

Next lesson is the retrieval pipeline — the bottom row of the diagram, properly this time. You take a question, embed it with that same model, pull the closest chunks out of db_chroma, build a prompt, and hand it to an LLM to answer. We got a preview of it today in demo seven; next time we build it properly, including what to do when the retriever comes back with nothing good.

If you are working along, the best thing you can do before then is swap my five Wikipedia articles for a set of documents you actually want to ask questions about. Everything we built today works unchanged — point DOCS_PATH at your folder, delete db_chroma, and re-run. The pipeline does not care what the documents are.

Thanks for working through it.


> **Essentials edition — tighter narration:**
>
> **So — that is Retrieval Augmented Generation.**
>
> Not a niche technique. **The default way a language model is given anything it was not trained on** — and now you know what is happening underneath every product that does it.
>
> You can draw both pipelines from memory. You can say what every box is for. You can predict roughly what a retriever will hand back, and **you know the one failure that will not announce itself.** That is genuinely most of it.
>
> If you want to go further, it is all at **ragverse dot d i y** — five playgrounds you can take apart in the browser, the code if you want to build it yourself, and a longer version if you want every aside.
>
> And the most useful thing you can do with it is **point it at documents you actually care about.** Everything you have seen today works unchanged.
>
> **Thanks for watching.**
