from .models import User, Cliente

def generate_prompt_json(platform, scene, character, mood, motion, time, lighting, style):
    return {
        "platform": platform,
        "scene": scene,
        "character": character,
        "mood": mood,
        "motion": motion,
        "time": time,
        "lighting": lighting,
        "style": style
    }

def to_descriptive_prompt(data):
    return (
        f"{data['character']} {data['motion']} in a {data['scene']} during {data['time']}, "
        f"with {data['lighting']}, evoking a {data['mood']} mood. {data['style']}."
    )

if __name__ == "__main__":
    json_prompt = generate_prompt_json(
        platform="Runway",
        scene="modern city street",
        character="A young woman with black hair",
        mood="calm and focused",
        motion="cooking a meal",
        time="night",
        lighting="ambient",
        style="cinematic, 4K"
    )

    print(to_descriptive_prompt(json_prompt))

    u = User("DaniloPortela")
    print(f"Username ASCII? {u.is_ascii()}")
