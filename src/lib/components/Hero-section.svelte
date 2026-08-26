<script lang="ts">
	interface Props {
        title: string;
        image: string;
    }
    let { title, image }: Props = $props();
</script>

<section class="mx-auto container relative max-h-72 overflow-hidden">
	<div class="absolute inset-0 w-3/5 bg-gradient-to-r from-bg-100/60 via-bg-100/40 via-70% to-bg-100/0 to-100% z-10 flex flex-col justify-center">
		<div class="w-3/4">
			<h1 class="text-3xl md:text-5xl text-center font-bold font-title text-white mb-8">{title}</h1>
		</div>
	</div>
	<img src={image} alt="hero" class="object-cover w-full h-full" draggable="false" />
</section>
